-- ============================================================================
-- MIGRACIÓN 002: VISTAS, FUNCIONES Y DISPARADORES
--
-- Aquí ponemos la LÓGICA DE NEGOCIO que conviene resolver en el servidor:
--   * Vistas   -> consultas de lectura ya "aplanadas" para el frontend.
--   * Funciones-> cálculos y operaciones compuestas (se llaman con .rpc()).
--   * Triggers -> automatismos (por ejemplo mantener `actualizado_en`).
--
-- Ejecutar DESPUÉS de 001_esquema_inicial.sql
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. DISPARADOR: mantener la columna `actualizado_en`
-- Evita que el frontend tenga que acordarse de enviar la fecha de cambio.
-- ---------------------------------------------------------------------------
create or replace function public.fn_actualizar_marca_tiempo()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_actualizado on public.usuarios;
create trigger trg_usuarios_actualizado
  before update on public.usuarios
  for each row
  execute function public.fn_actualizar_marca_tiempo();


-- ---------------------------------------------------------------------------
-- 2. VISTA: vista_transacciones_detalle
-- Une transacciones con su comercio para que el frontend reciba una fila
-- plana y no tenga que hacer joins manuales.
--
-- `monto_con_signo` ya aplica el signo según el tipo: útil para gráficos.
-- ---------------------------------------------------------------------------
-- security_invoker = on -> la vista respeta las políticas RLS del usuario que
-- consulta, en vez de las del dueño de la vista. Es la opción segura.
create or replace view public.vista_transacciones_detalle
with (security_invoker = on) as
select
  t.id,
  t.usuario_id,
  t.comercio_id,
  coalesce(c.nombre, 'Sin comercio')  as comercio_nombre,
  coalesce(c.categoria, 'Otros')      as comercio_categoria,
  c.logo_url                          as comercio_logo_url,
  coalesce(c.color_marca, '#2D3436')  as comercio_color,
  t.monto,
  -- Los egresos restan y los ingresos suman.
  case when t.tipo = 'egreso' then -t.monto else t.monto end as monto_con_signo,
  t.moneda,
  t.tipo,
  t.estado,
  t.descripcion,
  t.fecha,
  t.creado_en
from public.transacciones t
left join public.comercios c on c.id = t.comercio_id;

comment on view public.vista_transacciones_detalle is
  'Transacciones con los datos del comercio ya incorporados.';


-- ---------------------------------------------------------------------------
-- 3. FUNCIÓN: fn_volumen_pagos
-- Devuelve el volumen de pagos por día para el gráfico "Volumen de pagos".
--
-- Parámetros:
--   p_usuario -> usuario del que queremos el gráfico
--   p_dias    -> cuántos días hacia atrás (por defecto 7)
--
-- Usamos generate_series para que los días SIN movimientos también aparezcan
-- con total 0; si no, el gráfico se vería con huecos.
-- ---------------------------------------------------------------------------
create or replace function public.fn_volumen_pagos(
  p_usuario uuid,
  p_dias    integer default 7
)
returns table (
  dia    date,
  total  numeric
)
language sql
stable
as $$
  with dias as (
    -- Serie de fechas: desde hace (p_dias - 1) días hasta hoy.
    select generate_series(
             (current_date - (p_dias - 1)),
             current_date,
             interval '1 day'
           )::date as dia
  )
  select
    d.dia,
    -- coalesce -> si no hay transacciones ese día devolvemos 0 en lugar de null.
    coalesce(sum(t.monto), 0)::numeric as total
  from dias d
  left join public.transacciones t
         on t.fecha::date = d.dia
        and t.usuario_id  = p_usuario
        and t.estado      = 'completada'
  group by d.dia
  order by d.dia;
$$;

comment on function public.fn_volumen_pagos is
  'Suma diaria de transacciones completadas para el gráfico de volumen.';


-- ---------------------------------------------------------------------------
-- 4. FUNCIÓN: fn_resumen_usuario
-- Métricas de cabecera: total ingresado, total gastado, saldo y contadores
-- por estado. Se calcula en la base de datos porque es una simple agregación
-- y así evitamos descargar todas las filas al navegador.
-- ---------------------------------------------------------------------------
create or replace function public.fn_resumen_usuario(p_usuario uuid)
returns table (
  total_ingresos    numeric,
  total_egresos     numeric,
  saldo             numeric,
  num_completadas   bigint,
  num_pendientes    bigint,
  num_fallidas      bigint
)
language sql
stable
as $$
  select
    coalesce(sum(monto) filter (where tipo = 'ingreso' and estado = 'completada'), 0) as total_ingresos,
    coalesce(sum(monto) filter (where tipo = 'egreso'  and estado = 'completada'), 0) as total_egresos,
    coalesce(sum(monto) filter (where tipo = 'ingreso' and estado = 'completada'), 0)
      - coalesce(sum(monto) filter (where tipo = 'egreso' and estado = 'completada'), 0) as saldo,
    count(*) filter (where estado = 'completada') as num_completadas,
    count(*) filter (where estado = 'pendiente')  as num_pendientes,
    count(*) filter (where estado = 'fallida')    as num_fallidas
  from public.transacciones
  where usuario_id = p_usuario;
$$;

comment on function public.fn_resumen_usuario is
  'Totales e indicadores del panel para un usuario.';


-- ---------------------------------------------------------------------------
-- 5. FUNCIÓN: fn_obtener_tasa
-- Busca la tasa de cambio entre dos monedas. Si no existe el par directo
-- prueba el inverso (1 / tasa). Si tampoco existe devuelve 1.
-- ---------------------------------------------------------------------------
create or replace function public.fn_obtener_tasa(
  p_origen  char(3),
  p_destino char(3)
)
returns numeric
language plpgsql
stable
as $$
declare
  v_tasa numeric;
begin
  -- Misma moneda: la conversión es 1 a 1.
  if p_origen = p_destino then
    return 1;
  end if;

  -- 1) Par directo (EUR -> USD)
  select tasa into v_tasa
  from public.tasas_cambio
  where moneda_origen = p_origen and moneda_destino = p_destino;

  if found then
    return v_tasa;
  end if;

  -- 2) Par inverso (USD -> EUR guardado como EUR -> USD)
  select 1 / tasa into v_tasa
  from public.tasas_cambio
  where moneda_origen = p_destino and moneda_destino = p_origen;

  if found then
    return v_tasa;
  end if;

  -- 3) Sin datos: devolvemos 1 para no romper el cálculo.
  return 1;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. FUNCIÓN: fn_registrar_transferencia
-- Operación COMPUESTA y ATÓMICA (todo o nada):
--   a) calcula la conversión de moneda,
--   b) inserta la transferencia,
--   c) inserta la transacción de tipo egreso asociada,
--   d) crea la notificación para la campana.
--
-- Al vivir dentro de una función, si un paso falla se deshacen todos.
-- El frontend la invoca con supabase.rpc('fn_registrar_transferencia', {...}).
-- ---------------------------------------------------------------------------
create or replace function public.fn_registrar_transferencia(
  p_usuario_id  uuid,
  p_contacto_id uuid,
  p_monto       numeric,
  p_moneda_origen  char(3),
  p_moneda_destino char(3),
  p_nota        text default null
)
returns public.transferencias
language plpgsql
as $$
declare
  v_tasa          numeric;
  v_monto_destino numeric;
  v_transferencia public.transferencias;
  v_contacto      public.contactos;
begin
  -- Validación defensiva: el importe debe ser positivo.
  if p_monto is null or p_monto <= 0 then
    raise exception 'El importe de la transferencia debe ser mayor que cero';
  end if;

  -- El contacto debe pertenecer al usuario que envía.
  select * into v_contacto
  from public.contactos
  where id = p_contacto_id and usuario_id = p_usuario_id;

  if not found then
    raise exception 'El contacto indicado no pertenece al usuario';
  end if;

  -- a) Conversión de moneda con la tasa vigente.
  v_tasa := public.fn_obtener_tasa(p_moneda_origen, p_moneda_destino);
  v_monto_destino := round(p_monto * v_tasa, 2);

  -- b) Registro de la transferencia.
  insert into public.transferencias (
    usuario_id, contacto_id,
    monto_origen, moneda_origen,
    monto_destino, moneda_destino,
    tasa_aplicada, estado, nota
  )
  values (
    p_usuario_id, p_contacto_id,
    p_monto, p_moneda_origen,
    v_monto_destino, p_moneda_destino,
    v_tasa, 'pendiente', p_nota
  )
  returning * into v_transferencia;

  -- c) Movimiento contable asociado (sale dinero de la cuenta).
  insert into public.transacciones (
    usuario_id, comercio_id, monto, moneda, tipo, estado, descripcion, fecha
  )
  values (
    p_usuario_id,
    (select id from public.comercios where nombre = 'Payline' limit 1),
    p_monto, p_moneda_origen, 'egreso', 'pendiente',
    'Transferencia a ' || v_contacto.nombre,
    now()
  );

  -- d) Aviso para la campana del encabezado.
  insert into public.notificaciones (usuario_id, titulo, mensaje)
  values (
    p_usuario_id,
    'Transferencia enviada',
    'Has enviado ' || p_monto || ' ' || p_moneda_origen || ' a ' || v_contacto.nombre
  );

  return v_transferencia;
end;
$$;

comment on function public.fn_registrar_transferencia is
  'Crea una transferencia junto con su transacción y su notificación de forma atómica.';


-- ---------------------------------------------------------------------------
-- 7. PERMISOS DE EJECUCIÓN
-- PostgREST expone las funciones a los roles `anon` (sin sesión) y
-- `authenticated` (con sesión). Sin este GRANT el frontend recibiría un 404.
-- ---------------------------------------------------------------------------
grant execute on function public.fn_volumen_pagos(uuid, integer)            to anon, authenticated;
grant execute on function public.fn_resumen_usuario(uuid)                   to anon, authenticated;
grant execute on function public.fn_obtener_tasa(char, char)                to anon, authenticated;
grant execute on function public.fn_registrar_transferencia(uuid, uuid, numeric, char, char, text)
                                                                            to anon, authenticated;

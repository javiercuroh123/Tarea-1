-- ############################################################################
-- INSTALACIÓN COMPLETA DE LA BASE DE DATOS DE PAYLINE
-- Archivo GENERADO automáticamente por scripts/generar-sql-completo.mjs
-- No lo edites a mano: modifica los archivos originales y vuelve a generarlo.
-- Generado el 2026-09-02T19:44:47.828Z
-- ############################################################################


-- ////////////////////////////////////////////////////////////////////////
-- INICIO DE: supabase/migraciones/001_esquema_inicial.sql
-- ////////////////////////////////////////////////////////////////////////

-- ============================================================================
-- MIGRACIÓN 001: ESQUEMA INICIAL
-- Proyecto: Payline (panel de pagos y transacciones)
-- Motor:    PostgreSQL 15 (Supabase)
--
-- Este archivo crea los TIPOS, TABLAS, ÍNDICES y RESTRICCIONES base.
-- Se ejecuta UNA sola vez y en primer lugar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONES
-- pgcrypto nos proporciona gen_random_uuid() para generar identificadores UUID.
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- Usamos ENUM en lugar de texto libre para que la propia base de datos
-- garantice que solo existan valores válidos (integridad de datos).
-- ---------------------------------------------------------------------------

-- Estado en el que se encuentra una transacción o transferencia.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_transaccion') then
    create type public.estado_transaccion as enum ('completada', 'pendiente', 'fallida');
  end if;
end
$$;

-- Dirección del dinero: entra (ingreso) o sale (egreso) de la cuenta.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_transaccion') then
    create type public.tipo_transaccion as enum ('ingreso', 'egreso');
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- 2. TABLA: usuarios
-- Personas que usan el panel. En una app real esta tabla se enlazaría con
-- auth.users de Supabase; aquí la mantenemos independiente para la demo.
-- ---------------------------------------------------------------------------
create table if not exists public.usuarios (
  id              uuid primary key default gen_random_uuid(),
  nombre_completo text        not null,
  correo          text        not null unique,
  rol             text        not null default 'ADMIN',
  avatar_url      text,                                    -- URL opcional de la foto
  color_avatar    text        not null default '#6C5CE7',  -- color de respaldo si no hay foto
  moneda_base     char(3)     not null default 'EUR',      -- moneda por defecto del usuario
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table public.usuarios is 'Usuarios que acceden al panel de Payline.';


-- ---------------------------------------------------------------------------
-- 3. TABLA: contactos
-- Destinatarios frecuentes que aparecen en el widget "Transferencia rápida".
-- ---------------------------------------------------------------------------
create table if not exists public.contactos (
  id               uuid primary key default gen_random_uuid(),
  -- Si se borra el usuario se borran sus contactos (on delete cascade).
  usuario_id       uuid        not null references public.usuarios (id) on delete cascade,
  nombre           text        not null,
  correo           text,
  avatar_url       text,
  color_avatar     text        not null default '#00B894',
  moneda_preferida char(3)     not null default 'USD',
  favorito         boolean     not null default false,     -- se muestra primero en la lista
  creado_en        timestamptz not null default now()
);

-- Índice para listar rápido los contactos de un usuario, favoritos primero.
create index if not exists idx_contactos_usuario
  on public.contactos (usuario_id, favorito desc, nombre asc);

comment on table public.contactos is 'Destinatarios frecuentes para transferencias rápidas.';


-- ---------------------------------------------------------------------------
-- 4. TABLA: comercios
-- Catálogo de comercios y servicios (Amazon, PayPal, Wise...). Es un catálogo
-- compartido: no depende de un usuario concreto.
-- ---------------------------------------------------------------------------
create table if not exists public.comercios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text        not null unique,
  categoria   text        not null,                        -- "Compras online", "Servicios"...
  logo_url    text,                                        -- opcional; si es null se pinta la inicial
  color_marca text        not null default '#2D3436',      -- color corporativo para el avatar
  creado_en   timestamptz not null default now()
);

comment on table public.comercios is 'Catálogo de comercios y servicios asociados a las transacciones.';


-- ---------------------------------------------------------------------------
-- 5. TABLA: transacciones
-- Corazón de la aplicación: el historial que se muestra en la tabla "Historial".
--
-- NOTA DE DISEÑO: el importe se guarda SIEMPRE positivo y el signo lo aporta
-- la columna `tipo` (ingreso = +, egreso = -). Así evitamos importes negativos
-- inconsistentes y podemos sumar por tipo sin ambigüedad.
-- ---------------------------------------------------------------------------
create table if not exists public.transacciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid               not null references public.usuarios (id) on delete cascade,
  -- Si se borra un comercio no perdemos la transacción: queda con comercio nulo.
  comercio_id uuid               references public.comercios (id) on delete set null,
  monto       numeric(14, 2)     not null check (monto > 0),
  moneda      char(3)            not null default 'USD',
  tipo        tipo_transaccion   not null,
  estado      estado_transaccion not null default 'pendiente',
  descripcion text,
  fecha       timestamptz        not null default now(),
  creado_en   timestamptz        not null default now()
);

-- Índice principal: el historial siempre se ordena por fecha descendente.
create index if not exists idx_transacciones_usuario_fecha
  on public.transacciones (usuario_id, fecha desc);

-- Índice para el filtro por estado (completada / pendiente / fallida).
create index if not exists idx_transacciones_estado
  on public.transacciones (estado);

-- Índice para el filtro por comercio.
create index if not exists idx_transacciones_comercio
  on public.transacciones (comercio_id);

comment on table public.transacciones is 'Historial de movimientos de cada usuario.';


-- ---------------------------------------------------------------------------
-- 6. TABLA: tasas_cambio
-- Conversión entre monedas usada por el widget de transferencia rápida
-- (ejemplo de la maqueta: 1 EUR = 1.18 USD).
-- ---------------------------------------------------------------------------
create table if not exists public.tasas_cambio (
  id             uuid primary key default gen_random_uuid(),
  moneda_origen  char(3)        not null,
  moneda_destino char(3)        not null,
  tasa           numeric(12, 6) not null check (tasa > 0),
  actualizado_en timestamptz    not null default now(),
  -- No puede haber dos filas para el mismo par de monedas.
  constraint uq_tasas_par unique (moneda_origen, moneda_destino),
  -- No tiene sentido convertir una moneda en sí misma.
  constraint ck_tasas_distintas check (moneda_origen <> moneda_destino)
);

comment on table public.tasas_cambio is 'Tasas de conversión entre monedas.';


-- ---------------------------------------------------------------------------
-- 7. TABLA: transferencias
-- Envíos de dinero a un contacto. Guardamos la tasa aplicada en el momento
-- del envío (dato histórico: si la tasa cambia mañana, el registro no miente).
-- ---------------------------------------------------------------------------
create table if not exists public.transferencias (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid               not null references public.usuarios (id) on delete cascade,
  contacto_id    uuid               not null references public.contactos (id) on delete cascade,
  monto_origen   numeric(14, 2)     not null check (monto_origen > 0),
  moneda_origen  char(3)            not null,
  monto_destino  numeric(14, 2)     not null check (monto_destino > 0),
  moneda_destino char(3)            not null,
  tasa_aplicada  numeric(12, 6)     not null,
  estado         estado_transaccion not null default 'pendiente',
  nota           text,
  creado_en      timestamptz        not null default now()
);

create index if not exists idx_transferencias_usuario
  on public.transferencias (usuario_id, creado_en desc);

comment on table public.transferencias is 'Transferencias enviadas desde el widget de transferencia rápida.';


-- ---------------------------------------------------------------------------
-- 8. TABLA: notificaciones
-- Alimenta la campana del encabezado.
-- ---------------------------------------------------------------------------
create table if not exists public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid        not null references public.usuarios (id) on delete cascade,
  titulo     text        not null,
  mensaje    text,
  leida      boolean     not null default false,
  creado_en  timestamptz not null default now()
);

create index if not exists idx_notificaciones_usuario
  on public.notificaciones (usuario_id, leida, creado_en desc);

comment on table public.notificaciones is 'Avisos mostrados en la campana del encabezado.';


-- FIN DE: supabase/migraciones/001_esquema_inicial.sql


-- ////////////////////////////////////////////////////////////////////////
-- INICIO DE: supabase/migraciones/002_vistas_y_funciones.sql
-- ////////////////////////////////////////////////////////////////////////

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
security definer
set search_path = public
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


-- FIN DE: supabase/migraciones/002_vistas_y_funciones.sql


-- ////////////////////////////////////////////////////////////////////////
-- INICIO DE: supabase/migraciones/003_politicas_rls.sql
-- ////////////////////////////////////////////////////////////////////////

-- ============================================================================
-- MIGRACIÓN 003: SEGURIDAD A NIVEL DE FILA (RLS) Y PERMISOS
--
-- ¿Qué es RLS? Row Level Security. Con RLS activado, PostgreSQL rechaza
-- cualquier fila que no esté permitida explícitamente por una POLÍTICA.
-- Es la barrera que protege los datos cuando el frontend usa la clave `anon`
-- (una clave pública que cualquiera puede leer desde el navegador).
--
-- ⚠️  IMPORTANTE — MODO DEMO
-- Este proyecto es un ejercicio sin sistema de login, por lo que las políticas
-- permiten al rol `anon` leer y escribir. En PRODUCCIÓN habría que:
--   1. Usar Supabase Auth y enlazar `usuarios.id` con `auth.uid()`.
--   2. Sustituir `using (true)` por `using (usuario_id = auth.uid())`.
-- Al final del archivo se deja el bloque listo para ese cambio.
--
-- Ejecutar DESPUÉS de 002_vistas_y_funciones.sql
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. ACTIVAR RLS EN TODAS LAS TABLAS
-- Sin políticas, activar RLS deja la tabla completamente cerrada (deny by
-- default). Las políticas se añaden en el punto 3.
-- ---------------------------------------------------------------------------
alter table public.usuarios        enable row level security;
alter table public.contactos       enable row level security;
alter table public.comercios       enable row level security;
alter table public.transacciones   enable row level security;
alter table public.tasas_cambio    enable row level security;
alter table public.transferencias  enable row level security;
alter table public.notificaciones  enable row level security;


-- ---------------------------------------------------------------------------
-- 2. PERMISOS DE TABLA (capa anterior a RLS)
-- RLS filtra filas, pero el rol necesita además el permiso SQL básico.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.usuarios       to anon, authenticated;
grant select on public.contactos      to anon, authenticated;
grant select on public.comercios      to anon, authenticated;
grant select on public.tasas_cambio   to anon, authenticated;
grant select on public.vista_transacciones_detalle to anon, authenticated;

grant select, insert, update, delete on public.transacciones  to anon, authenticated;
grant select, insert                 on public.transferencias to anon, authenticated;
grant select, insert, update         on public.notificaciones to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. POLÍTICAS
-- Cada política responde a: ¿QUIÉN puede hacer QUÉ sobre QUÉ filas?
--   using      -> filas que puede VER / afectar
--   with check -> condición que deben cumplir las filas NUEVAS o modificadas
-- ---------------------------------------------------------------------------

-- --- usuarios: solo lectura -------------------------------------------------
drop policy if exists pol_usuarios_lectura on public.usuarios;
create policy pol_usuarios_lectura
  on public.usuarios
  for select
  to anon, authenticated
  using (true);

-- --- comercios: catálogo público de solo lectura ----------------------------
drop policy if exists pol_comercios_lectura on public.comercios;
create policy pol_comercios_lectura
  on public.comercios
  for select
  to anon, authenticated
  using (true);

-- --- tasas_cambio: solo lectura ---------------------------------------------
drop policy if exists pol_tasas_lectura on public.tasas_cambio;
create policy pol_tasas_lectura
  on public.tasas_cambio
  for select
  to anon, authenticated
  using (true);

-- --- contactos: solo lectura ------------------------------------------------
drop policy if exists pol_contactos_lectura on public.contactos;
create policy pol_contactos_lectura
  on public.contactos
  for select
  to anon, authenticated
  using (true);

-- --- transacciones: lectura y escritura (la app permite crear/editar) -------
drop policy if exists pol_transacciones_lectura on public.transacciones;
create policy pol_transacciones_lectura
  on public.transacciones
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_transacciones_insercion on public.transacciones;
create policy pol_transacciones_insercion
  on public.transacciones
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists pol_transacciones_actualizacion on public.transacciones;
create policy pol_transacciones_actualizacion
  on public.transacciones
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists pol_transacciones_borrado on public.transacciones;
create policy pol_transacciones_borrado
  on public.transacciones
  for delete
  to anon, authenticated
  using (true);

-- --- transferencias: lectura e inserción ------------------------------------
drop policy if exists pol_transferencias_lectura on public.transferencias;
create policy pol_transferencias_lectura
  on public.transferencias
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_transferencias_insercion on public.transferencias;
create policy pol_transferencias_insercion
  on public.transferencias
  for insert
  to anon, authenticated
  with check (monto_origen > 0);   -- validación mínima también en la BD

-- --- notificaciones: leer, crear y marcar como leídas -----------------------
drop policy if exists pol_notificaciones_lectura on public.notificaciones;
create policy pol_notificaciones_lectura
  on public.notificaciones
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_notificaciones_insercion on public.notificaciones;
create policy pol_notificaciones_insercion
  on public.notificaciones
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists pol_notificaciones_actualizacion on public.notificaciones;
create policy pol_notificaciones_actualizacion
  on public.notificaciones
  for update
  to anon, authenticated
  using (true)
  with check (true);


-- ---------------------------------------------------------------------------
-- 4. PLANTILLA PARA PRODUCCIÓN (comentada)
-- Cuando se añada Supabase Auth, basta con reemplazar las políticas anteriores
-- por estas, que solo dejan ver y tocar los datos del usuario autenticado.
-- ---------------------------------------------------------------------------
-- create policy pol_transacciones_propias
--   on public.transacciones
--   for all
--   to authenticated
--   using      (usuario_id = auth.uid())
--   with check (usuario_id = auth.uid());
--
-- create policy pol_contactos_propios
--   on public.contactos
--   for all
--   to authenticated
--   using      (usuario_id = auth.uid())
--   with check (usuario_id = auth.uid());


-- FIN DE: supabase/migraciones/003_politicas_rls.sql


-- ////////////////////////////////////////////////////////////////////////
-- INICIO DE: supabase/semillas/001_datos_demo.sql
-- ////////////////////////////////////////////////////////////////////////

-- ============================================================================
-- SEMILLA 001: DATOS DE DEMOSTRACIÓN
--
-- Rellena la base de datos con el contenido que se ve en la maqueta:
-- un usuario administrador, sus contactos, el catálogo de comercios y un
-- historial de transacciones de los últimos días.
--
-- Es IDEMPOTENTE: se puede volver a ejecutar tantas veces como haga falta,
-- porque primero limpia los datos del usuario de demostración.
--
-- Ejecutar DESPUÉS de las tres migraciones.
-- ============================================================================

-- El id del usuario demo está FIJADO a propósito: el frontend lo lleva en su
-- archivo de entorno (environment.ts) para saber a quién mostrar.
-- ⚠️ Si cambias este UUID, cámbialo también en el frontend.
--    -> frontend/src/environments/environment.ts  (usuarioDemoId)

begin;

-- ---------------------------------------------------------------------------
-- 0. LIMPIEZA de la ejecución anterior
-- El borrado en cascada de `usuarios` arrastra contactos, transacciones,
-- transferencias y notificaciones asociadas.
-- ---------------------------------------------------------------------------
delete from public.usuarios where id = '11111111-1111-4111-8111-111111111111';


-- ---------------------------------------------------------------------------
-- 1. USUARIO DEMO
-- ---------------------------------------------------------------------------
insert into public.usuarios (id, nombre_completo, correo, rol, color_avatar, moneda_base)
values (
  '11111111-1111-4111-8111-111111111111',
  'William Grace',
  'william.grace@payline.dev',
  'ADMIN',
  '#5B4DF0',
  'EUR'
);


-- ---------------------------------------------------------------------------
-- 2. CONTACTOS para la transferencia rápida
-- ---------------------------------------------------------------------------
insert into public.contactos (id, usuario_id, nombre, correo, color_avatar, moneda_preferida, favorito)
values
  ('22222222-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Anabel Smith',    'anabel@correo.dev',   '#C084FC', 'USD', true),
  ('22222222-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'Ethan Moore',     'ethan@correo.dev',    '#34D399', 'USD', true),
  ('22222222-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Gabriel Ortiz',   'gabriel@correo.dev',  '#60A5FA', 'EUR', false),
  ('22222222-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'Hermoine Vega',   'hermoine@correo.dev', '#F472B6', 'GBP', false),
  ('22222222-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111',
   'Lucas Iglesias',  'lucas@correo.dev',    '#FBBF24', 'USD', false);


-- ---------------------------------------------------------------------------
-- 3. CATÁLOGO DE COMERCIOS
-- `on conflict do nothing` -> el catálogo es compartido, no lo duplicamos si
-- la semilla se ejecuta más de una vez.
-- ---------------------------------------------------------------------------
insert into public.comercios (id, nombre, categoria, color_marca)
values
  ('33333333-0000-4000-8000-000000000001', 'Amazon',          'Compras online',  '#FF9900'),
  ('33333333-0000-4000-8000-000000000002', 'Adobe Photoshop', 'Servicios',       '#E3262A'),
  ('33333333-0000-4000-8000-000000000003', 'PayPal',          'Transferencias',  '#1E3A8A'),
  ('33333333-0000-4000-8000-000000000004', 'Ebay',            'Compras online',  '#0064D2'),
  ('33333333-0000-4000-8000-000000000005', 'Wise',            'Transferencias',  '#9FE870'),
  ('33333333-0000-4000-8000-000000000006', 'Airbnb',          'Servicios',       '#FF5A5F'),
  ('33333333-0000-4000-8000-000000000007', 'Netflix',         'Entretenimiento', '#E50914'),
  ('33333333-0000-4000-8000-000000000008', 'Spotify',         'Entretenimiento', '#1DB954'),
  ('33333333-0000-4000-8000-000000000009', 'Uber',            'Transporte',      '#111111'),
  ('33333333-0000-4000-8000-000000000010', 'Payline',         'Transferencias',  '#5B4DF0')
on conflict (nombre) do nothing;


-- ---------------------------------------------------------------------------
-- 4. TASAS DE CAMBIO
-- ---------------------------------------------------------------------------
insert into public.tasas_cambio (moneda_origen, moneda_destino, tasa)
values
  ('EUR', 'USD', 1.180000),
  ('EUR', 'GBP', 0.850000),
  ('USD', 'GBP', 0.720000),
  ('USD', 'PEN', 3.750000),
  ('EUR', 'PEN', 4.425000)
on conflict (moneda_origen, moneda_destino) do update
  set tasa = excluded.tasa,
      actualizado_en = now();


-- ---------------------------------------------------------------------------
-- 5. HISTORIAL DE TRANSACCIONES
-- Las fechas son RELATIVAS a hoy (now() - interval) para que el gráfico de
-- volumen siempre tenga datos recientes, sea cual sea el día de la ejecución.
-- ---------------------------------------------------------------------------
insert into public.transacciones (usuario_id, comercio_id, monto, moneda, tipo, estado, descripcion, fecha)
values
  -- --- Hoy y ayer ----------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000001',
   150.00, 'USD', 'egreso', 'completada', 'Compra de material de oficina', now() - interval '2 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000002',
   55.00, 'USD', 'egreso', 'completada', 'Suscripción mensual', now() - interval '1 day'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000005',
   1000.00, 'USD', 'ingreso', 'completada', 'Pago recibido de cliente', now() - interval '1 day 3 hours'),

  -- --- Hace 2 días ---------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000003',
   3456.00, 'USD', 'egreso', 'fallida', 'Transferencia rechazada por el banco', now() - interval '2 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000008',
   10.99, 'USD', 'egreso', 'completada', 'Plan familiar', now() - interval '2 days 5 hours'),

  -- --- Hace 3 días ---------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000004',
   220.80, 'USD', 'egreso', 'pendiente', 'Pedido pendiente de envío', now() - interval '3 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000006',
   220.80, 'USD', 'egreso', 'completada', 'Reserva de alojamiento', now() - interval '3 days 6 hours'),

  -- --- Hace 4 días ---------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000003',
   1000.00, 'USD', 'egreso', 'fallida', 'Fondos insuficientes', now() - interval '4 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000009',
   32.40, 'USD', 'egreso', 'completada', 'Trayectos del mes', now() - interval '4 days 2 hours'),

  -- --- Hace 5 días ---------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000001',
   89.90, 'USD', 'egreso', 'completada', 'Accesorios informáticos', now() - interval '5 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000005',
   2340.00, 'USD', 'ingreso', 'completada', 'Factura F-2043 cobrada', now() - interval '5 days 4 hours'),

  -- --- Hace 6 días ---------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000007',
   17.99, 'USD', 'egreso', 'completada', 'Suscripción mensual', now() - interval '6 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000004',
   410.25, 'USD', 'egreso', 'completada', 'Compra de equipamiento', now() - interval '6 days 7 hours'),

  -- --- Hace 7 días ---------------------------------------------------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000003',
   780.00, 'USD', 'ingreso', 'completada', 'Reembolso de proveedor', now() - interval '7 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000006',
   145.60, 'USD', 'egreso', 'pendiente', 'Reserva en revisión', now() - interval '7 days 3 hours'),

  -- --- Movimientos más antiguos (para paginación y filtros) ----------------
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000001',
   64.30, 'USD', 'egreso', 'completada', 'Libros técnicos', now() - interval '9 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000009',
   12.10, 'USD', 'egreso', 'completada', 'Viaje al aeropuerto', now() - interval '11 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000005',
   1500.00, 'USD', 'ingreso', 'completada', 'Anticipo de proyecto', now() - interval '13 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000002',
   55.00, 'USD', 'egreso', 'fallida', 'Tarjeta caducada', now() - interval '15 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000008',
   10.99, 'USD', 'egreso', 'completada', 'Plan familiar', now() - interval '18 days');


-- ---------------------------------------------------------------------------
-- 6. NOTIFICACIONES iniciales (campana del encabezado)
-- ---------------------------------------------------------------------------
insert into public.notificaciones (usuario_id, titulo, mensaje, leida)
values
  ('11111111-1111-4111-8111-111111111111',
   'Pago rechazado', 'La transferencia de 3.456,00 USD a PayPal no se pudo completar.', false),
  ('11111111-1111-4111-8111-111111111111',
   'Pago recibido',  'Has recibido 1.000,00 USD a través de Wise.', false),
  ('11111111-1111-4111-8111-111111111111',
   'Resumen semanal','Tu volumen de pagos creció un 12 % esta semana.', true);

commit;

-- ---------------------------------------------------------------------------
-- Comprobación rápida (opcional): descomenta para ver el recuento.
-- ---------------------------------------------------------------------------
-- select 'usuarios' as tabla, count(*) from public.usuarios
-- union all select 'contactos',      count(*) from public.contactos
-- union all select 'comercios',      count(*) from public.comercios
-- union all select 'transacciones',  count(*) from public.transacciones
-- union all select 'tasas_cambio',   count(*) from public.tasas_cambio;


-- FIN DE: supabase/semillas/001_datos_demo.sql

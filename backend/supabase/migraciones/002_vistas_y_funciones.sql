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
    select generate_series(
             (current_date - (p_dias - 1)),
             current_date,
             interval '1 day'
           )::date as dia
  )
  select
    d.dia,
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
  if p_origen = p_destino then
    return 1;
  end if;

  select tasa into v_tasa
  from public.tasas_cambio
  where moneda_origen = p_origen and moneda_destino = p_destino;

  if found then
    return v_tasa;
  end if;

  select 1 / tasa into v_tasa
  from public.tasas_cambio
  where moneda_origen = p_destino and moneda_destino = p_origen;

  if found then
    return v_tasa;
  end if;

  return 1;
end;
$$;

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
  v_tasa              numeric;
  v_monto_destino     numeric;
  v_transferencia     public.transferencias;
  v_contacto          public.contactos;
  v_destinatario_id   uuid;
  v_remitente_nombre  text;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El importe de la transferencia debe ser mayor que cero';
  end if;

  select * into v_contacto
  from public.contactos
  where id = p_contacto_id and usuario_id = p_usuario_id;

  if not found then
    raise exception 'El contacto indicado no pertenece al usuario';
  end if;

  select nombre_completo into v_remitente_nombre
  from public.usuarios
  where id = p_usuario_id;

  if v_contacto.correo is not null then
    select id into v_destinatario_id
    from public.usuarios
    where lower(correo) = lower(v_contacto.correo)
      and id <> p_usuario_id
    limit 1;
  end if;

  v_tasa := public.fn_obtener_tasa(p_moneda_origen, p_moneda_destino);
  v_monto_destino := round(p_monto * v_tasa, 2);

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
    v_tasa, 'completada', p_nota
  )
  returning * into v_transferencia;

  insert into public.transacciones (
    usuario_id, comercio_id, monto, moneda, tipo, estado, descripcion, fecha
  )
  values (
    p_usuario_id,
    (select id from public.comercios where nombre = 'Payline' limit 1),
    p_monto, p_moneda_origen, 'egreso', 'completada',
    'Transferencia a ' || v_contacto.nombre,
    now()
  );

  insert into public.notificaciones (usuario_id, titulo, mensaje)
  values (
    p_usuario_id,
    'Transferencia enviada',
    'Has enviado ' || p_monto || ' ' || p_moneda_origen || ' a ' || v_contacto.nombre
  );

  if v_destinatario_id is not null then
    insert into public.transacciones (
      usuario_id, comercio_id, monto, moneda, tipo, estado, descripcion, fecha
    )
    values (
      v_destinatario_id,
      (select id from public.comercios where nombre = 'Payline' limit 1),
      v_monto_destino, p_moneda_destino, 'ingreso', 'completada',
      'Transferencia recibida de ' || coalesce(v_remitente_nombre, 'Usuario'),
      now()
    );

    insert into public.notificaciones (usuario_id, titulo, mensaje)
    values (
      v_destinatario_id,
      'Transferencia recibida',
      'Has recibido ' || v_monto_destino || ' ' || p_moneda_destino || ' de ' || coalesce(v_remitente_nombre, 'un usuario')
    );
  end if;

  return v_transferencia;
end;
$$;

comment on function public.fn_registrar_transferencia is
  'Crea una transferencia junto con su transacción y su notificación de forma atómica.';

grant execute on function public.fn_volumen_pagos(uuid, integer)            to anon, authenticated;
grant execute on function public.fn_resumen_usuario(uuid)                   to anon, authenticated;
grant execute on function public.fn_obtener_tasa(char, char)                to anon, authenticated;
grant execute on function public.fn_registrar_transferencia(uuid, uuid, numeric, char, char, text)
                                                                            to anon, authenticated;

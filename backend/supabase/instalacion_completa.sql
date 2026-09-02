create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_transaccion') then
    create type public.estado_transaccion as enum ('completada', 'pendiente', 'fallida');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_transaccion') then
    create type public.tipo_transaccion as enum ('ingreso', 'egreso');
  end if;
end
$$;

create table if not exists public.usuarios (
  id              uuid primary key default gen_random_uuid(),
  nombre_completo text        not null,
  correo          text        not null unique,
  rol             text        not null default 'ADMIN',
  avatar_url      text,
  color_avatar    text        not null default '#6C5CE7',
  moneda_base     char(3)     not null default 'EUR',
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table public.usuarios is 'Usuarios que acceden al panel de Payline.';

create table if not exists public.contactos (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid        not null references public.usuarios (id) on delete cascade,
  nombre           text        not null,
  correo           text,
  avatar_url       text,
  color_avatar     text        not null default '#00B894',
  moneda_preferida char(3)     not null default 'USD',
  favorito         boolean     not null default false,
  creado_en        timestamptz not null default now()
);

create index if not exists idx_contactos_usuario
  on public.contactos (usuario_id, favorito desc, nombre asc);

comment on table public.contactos is 'Destinatarios frecuentes para transferencias rápidas.';

create table if not exists public.comercios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text        not null unique,
  categoria   text        not null,
  logo_url    text,
  color_marca text        not null default '#2D3436',
  creado_en   timestamptz not null default now()
);

comment on table public.comercios is 'Catálogo de comercios y servicios asociados a las transacciones.';

create table if not exists public.transacciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid               not null references public.usuarios (id) on delete cascade,
  comercio_id uuid               references public.comercios (id) on delete set null,
  monto       numeric(14, 2)     not null check (monto > 0),
  moneda      char(3)            not null default 'USD',
  tipo        tipo_transaccion   not null,
  estado      estado_transaccion not null default 'pendiente',
  descripcion text,
  fecha       timestamptz        not null default now(),
  creado_en   timestamptz        not null default now()
);

create index if not exists idx_transacciones_usuario_fecha
  on public.transacciones (usuario_id, fecha desc);

create index if not exists idx_transacciones_estado
  on public.transacciones (estado);

create index if not exists idx_transacciones_comercio
  on public.transacciones (comercio_id);

comment on table public.transacciones is 'Historial de movimientos de cada usuario.';

create table if not exists public.tasas_cambio (
  id             uuid primary key default gen_random_uuid(),
  moneda_origen  char(3)        not null,
  moneda_destino char(3)        not null,
  tasa           numeric(12, 6) not null check (tasa > 0),
  actualizado_en timestamptz    not null default now(),
  constraint uq_tasas_par unique (moneda_origen, moneda_destino),
  constraint ck_tasas_distintas check (moneda_origen <> moneda_destino)
);

comment on table public.tasas_cambio is 'Tasas de conversión entre monedas.';

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

alter table public.usuarios        enable row level security;
alter table public.contactos       enable row level security;
alter table public.comercios       enable row level security;
alter table public.transacciones   enable row level security;
alter table public.tasas_cambio    enable row level security;
alter table public.transferencias  enable row level security;
alter table public.notificaciones  enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.usuarios       to anon, authenticated;
grant select, insert, update, delete on public.contactos to anon, authenticated;
grant select on public.comercios      to anon, authenticated;
grant select on public.tasas_cambio   to anon, authenticated;
grant select on public.vista_transacciones_detalle to anon, authenticated;

grant select, insert, update, delete on public.transacciones  to anon, authenticated;
grant select, insert                 on public.transferencias to anon, authenticated;
grant select, insert, update         on public.notificaciones to anon, authenticated;

drop policy if exists pol_usuarios_lectura on public.usuarios;
create policy pol_usuarios_lectura
  on public.usuarios
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_usuarios_insercion on public.usuarios;
create policy pol_usuarios_insercion
  on public.usuarios
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists pol_usuarios_actualizacion on public.usuarios;
create policy pol_usuarios_actualizacion
  on public.usuarios
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists pol_comercios_lectura on public.comercios;
create policy pol_comercios_lectura
  on public.comercios
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_tasas_lectura on public.tasas_cambio;
create policy pol_tasas_lectura
  on public.tasas_cambio
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_contactos_lectura on public.contactos;
create policy pol_contactos_lectura
  on public.contactos
  for select
  to anon, authenticated
  using (true);

drop policy if exists pol_contactos_insercion on public.contactos;
create policy pol_contactos_insercion
  on public.contactos
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists pol_contactos_actualizacion on public.contactos;
create policy pol_contactos_actualizacion
  on public.contactos
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists pol_contactos_borrado on public.contactos;
create policy pol_contactos_borrado
  on public.contactos
  for delete
  to anon, authenticated
  using (true);

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
  with check (monto_origen > 0);

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

begin;

delete from public.usuarios where id = '11111111-1111-4111-8111-111111111111';

insert into public.usuarios (id, nombre_completo, correo, rol, color_avatar, moneda_base)
values (
  '11111111-1111-4111-8111-111111111111',
  'William Grace',
  'william.grace@payline.dev',
  'ADMIN',
  '#5B4DF0',
  'EUR'
);

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

insert into public.transacciones (usuario_id, comercio_id, monto, moneda, tipo, estado, descripcion, fecha)
values
  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000001',
   150.00, 'USD', 'egreso', 'completada', 'Compra de material de oficina', now() - interval '2 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000002',
   55.00, 'USD', 'egreso', 'completada', 'Suscripción mensual', now() - interval '1 day'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000005',
   1000.00, 'USD', 'ingreso', 'completada', 'Pago recibido de cliente', now() - interval '1 day 3 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000003',
   3456.00, 'USD', 'egreso', 'fallida', 'Transferencia rechazada por el banco', now() - interval '2 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000008',
   10.99, 'USD', 'egreso', 'completada', 'Plan familiar', now() - interval '2 days 5 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000004',
   220.80, 'USD', 'egreso', 'pendiente', 'Pedido pendiente de envío', now() - interval '3 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000006',
   220.80, 'USD', 'egreso', 'completada', 'Reserva de alojamiento', now() - interval '3 days 6 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000003',
   1000.00, 'USD', 'egreso', 'fallida', 'Fondos insuficientes', now() - interval '4 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000009',
   32.40, 'USD', 'egreso', 'completada', 'Trayectos del mes', now() - interval '4 days 2 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000001',
   89.90, 'USD', 'egreso', 'completada', 'Accesorios informáticos', now() - interval '5 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000005',
   2340.00, 'USD', 'ingreso', 'completada', 'Factura F-2043 cobrada', now() - interval '5 days 4 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000007',
   17.99, 'USD', 'egreso', 'completada', 'Suscripción mensual', now() - interval '6 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000004',
   410.25, 'USD', 'egreso', 'completada', 'Compra de equipamiento', now() - interval '6 days 7 hours'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000003',
   780.00, 'USD', 'ingreso', 'completada', 'Reembolso de proveedor', now() - interval '7 days'),

  ('11111111-1111-4111-8111-111111111111', '33333333-0000-4000-8000-000000000006',
   145.60, 'USD', 'egreso', 'pendiente', 'Reserva en revisión', now() - interval '7 days 3 hours'),

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

insert into public.notificaciones (usuario_id, titulo, mensaje, leida)
values
  ('11111111-1111-4111-8111-111111111111',
   'Pago rechazado', 'La transferencia de 3.456,00 USD a PayPal no se pudo completar.', false),
  ('11111111-1111-4111-8111-111111111111',
   'Pago recibido',  'Has recibido 1.000,00 USD a través de Wise.', false),
  ('11111111-1111-4111-8111-111111111111',
   'Resumen semanal','Tu volumen de pagos creció un 12 % esta semana.', true);

commit;

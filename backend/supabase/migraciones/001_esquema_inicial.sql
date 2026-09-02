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

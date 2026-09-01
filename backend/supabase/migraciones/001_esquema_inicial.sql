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

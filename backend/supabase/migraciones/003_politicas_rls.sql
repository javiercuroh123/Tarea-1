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

grant select, insert, update on public.usuarios       to anon, authenticated;
grant select, insert, update, delete on public.contactos to anon, authenticated;
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

-- --- usuarios: lectura, creación y actualización ----------------------------
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

-- --- contactos: lectura, creación, edición y borrado ------------------------
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

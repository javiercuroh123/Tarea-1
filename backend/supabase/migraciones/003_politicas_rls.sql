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

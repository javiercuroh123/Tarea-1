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

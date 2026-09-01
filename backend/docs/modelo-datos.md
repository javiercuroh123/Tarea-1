# Diccionario de datos

Descripción campo a campo del esquema `public`. Todos los identificadores son
`uuid` generados con `gen_random_uuid()`.

---

## Tipos enumerados

| Tipo | Valores | Uso |
|------|---------|-----|
| `estado_transaccion` | `completada`, `pendiente`, `fallida` | Etiqueta de estado en el historial |
| `tipo_transaccion` | `ingreso`, `egreso` | Dirección del dinero (aporta el signo) |

---

## `usuarios`

Persona que accede al panel.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `nombre_completo` | `text` | no | Nombre mostrado en el encabezado |
| `correo` | `text` | no | **Único** |
| `rol` | `text` | no | `ADMIN` por defecto |
| `avatar_url` | `text` | sí | Foto opcional; si es nula se pintan las iniciales |
| `color_avatar` | `text` | no | Color de respaldo del avatar |
| `moneda_base` | `char(3)` | no | Moneda por defecto (`EUR`) |
| `creado_en` | `timestamptz` | no | Alta |
| `actualizado_en` | `timestamptz` | no | Lo mantiene el trigger `trg_usuarios_actualizado` |

---

## `contactos`

Destinatarios frecuentes de la *transferencia rápida*.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `usuario_id` | `uuid` | no | → `usuarios.id`, **on delete cascade** |
| `nombre` | `text` | no | Nombre del destinatario |
| `correo` | `text` | sí | |
| `avatar_url` | `text` | sí | |
| `color_avatar` | `text` | no | Color del círculo del avatar |
| `moneda_preferida` | `char(3)` | no | Moneda en la que recibe |
| `favorito` | `boolean` | no | Los favoritos se listan primero |
| `creado_en` | `timestamptz` | no | |

Índice: `idx_contactos_usuario (usuario_id, favorito desc, nombre asc)`

---

## `comercios`

Catálogo **compartido** de comercios y servicios. No pertenece a ningún usuario.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `nombre` | `text` | no | **Único** (Amazon, PayPal...) |
| `categoria` | `text` | no | «Compras online», «Servicios»... |
| `logo_url` | `text` | sí | Si es nulo se pinta la inicial sobre `color_marca` |
| `color_marca` | `text` | no | Color corporativo |
| `creado_en` | `timestamptz` | no | |

---

## `transacciones`

El historial. Es la tabla más consultada de la aplicación.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `usuario_id` | `uuid` | no | → `usuarios.id`, **on delete cascade** |
| `comercio_id` | `uuid` | sí | → `comercios.id`, **on delete set null** |
| `monto` | `numeric(14,2)` | no | **Siempre positivo** (`check monto > 0`) |
| `moneda` | `char(3)` | no | |
| `tipo` | `tipo_transaccion` | no | Aporta el signo al mostrarlo |
| `estado` | `estado_transaccion` | no | |
| `descripcion` | `text` | sí | |
| `fecha` | `timestamptz` | no | Fecha del movimiento (orden del historial) |
| `creado_en` | `timestamptz` | no | Fecha de inserción |

Índices:

- `idx_transacciones_usuario_fecha (usuario_id, fecha desc)` — orden del historial
- `idx_transacciones_estado (estado)` — filtro por estado
- `idx_transacciones_comercio (comercio_id)` — filtro por comercio

---

## `tasas_cambio`

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `moneda_origen` | `char(3)` | no | |
| `moneda_destino` | `char(3)` | no | |
| `tasa` | `numeric(12,6)` | no | `check tasa > 0` |
| `actualizado_en` | `timestamptz` | no | |

Restricciones: `unique (moneda_origen, moneda_destino)` y
`check (moneda_origen <> moneda_destino)`.

---

## `transferencias`

Envío de dinero a un contacto. Guarda la tasa **aplicada en ese momento**, de
modo que el registro histórico no cambia aunque la tasa se actualice después.

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `usuario_id` | `uuid` | no | → `usuarios.id` |
| `contacto_id` | `uuid` | no | → `contactos.id` |
| `monto_origen` | `numeric(14,2)` | no | Lo que sale (`check > 0`) |
| `moneda_origen` | `char(3)` | no | |
| `monto_destino` | `numeric(14,2)` | no | Lo que llega (`check > 0`) |
| `moneda_destino` | `char(3)` | no | |
| `tasa_aplicada` | `numeric(12,6)` | no | Tasa congelada |
| `estado` | `estado_transaccion` | no | |
| `nota` | `text` | sí | Concepto opcional |
| `creado_en` | `timestamptz` | no | |

---

## `notificaciones`

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `uuid` | no | Clave primaria |
| `usuario_id` | `uuid` | no | → `usuarios.id` |
| `titulo` | `text` | no | |
| `mensaje` | `text` | sí | |
| `leida` | `boolean` | no | El punto rojo de la campana cuenta las no leídas |
| `creado_en` | `timestamptz` | no | |

---

## Vista `vista_transacciones_detalle`

Une `transacciones` con `comercios` para que el frontend reciba una fila plana.
Se crea con `security_invoker = on`, por lo que **respeta las políticas RLS**
del usuario que consulta.

Columnas añadidas respecto a `transacciones`:

| Columna | Descripción |
|---------|-------------|
| `comercio_nombre` | `'Sin comercio'` si la transacción quedó huérfana |
| `comercio_categoria` | `'Otros'` por defecto |
| `comercio_logo_url` | |
| `comercio_color` | |
| `monto_con_signo` | Negativo en los egresos: listo para gráficos |

---

## Funciones

| Función | Tipo | Descripción |
|---------|------|-------------|
| `fn_actualizar_marca_tiempo()` | trigger | Pone `actualizado_en = now()` antes de cada UPDATE |
| `fn_volumen_pagos(uuid, int)` | `stable` | Suma diaria de transacciones **completadas**. Usa `generate_series` para que los días sin movimientos salgan con total 0 |
| `fn_resumen_usuario(uuid)` | `stable` | Ingresos, egresos, saldo y contadores por estado |
| `fn_obtener_tasa(char, char)` | `stable` | Tasa entre dos monedas; prueba el par inverso y devuelve 1 si no hay datos |
| `fn_registrar_transferencia(...)` | `volatile` | Operación atómica: transferencia + transacción + notificación |

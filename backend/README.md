# Backend — Capa de datos (Supabase / PostgreSQL)

Aquí vive **todo lo que no es interfaz**: el esquema de la base de datos, la
lógica de negocio en SQL, las reglas de seguridad y los scripts de utilidad.
El frontend Angular no contiene ni una sola sentencia SQL: solo llama a esta capa.

---

## 1. Estructura

```
backend/
├── config/
│   └── supabase.config.mjs          # URL + clave anónima usadas por los scripts
├── docs/
│   └── modelo-datos.md              # Diccionario de datos y relaciones
├── scripts/
│   ├── generar-sql-completo.mjs     # Une migraciones + semilla en un solo .sql
│   └── verificar-conexion.mjs       # Comprueba que la BD está bien instalada
├── supabase/
│   ├── migraciones/
│   │   ├── 001_esquema_inicial.sql  # Tipos, tablas, índices, restricciones
│   │   ├── 002_vistas_y_funciones.sql # Vistas, funciones RPC y triggers
│   │   └── 003_politicas_rls.sql    # Row Level Security y permisos
│   ├── semillas/
│   │   └── 001_datos_demo.sql       # Datos de ejemplo (usuario, comercios...)
│   └── instalacion_completa.sql     # GENERADO: los 4 anteriores en un archivo
└── package.json
```

---

## 2. Instalación de la base de datos (una sola vez)

> No hace falta instalar nada: los scripts usan el `fetch` nativo de Node 18+.

1. Entra en el **panel de Supabase** → tu proyecto → menú lateral **SQL Editor**.
2. Pulsa **New query**.
3. Abre `supabase/instalacion_completa.sql`, copia **todo** su contenido y pégalo.
4. Pulsa **Run**.

Si prefieres ir paso a paso, ejecuta los archivos en este orden exacto:

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | `migraciones/001_esquema_inicial.sql` | Crea tipos, tablas e índices |
| 2 | `migraciones/002_vistas_y_funciones.sql` | Crea la vista, las funciones RPC y el trigger |
| 3 | `migraciones/003_politicas_rls.sql` | Activa RLS y concede permisos |
| 4 | `semillas/001_datos_demo.sql` | Inserta los datos de demostración |

### Comprobar que ha funcionado

```bash
cd backend
npm run verificar
```

Debe imprimir `OK` en las 8 tablas/vistas y en las 2 funciones RPC.

---

## 3. Modelo de datos (resumen)

```
usuarios ──1:N──> contactos ──1:N──> transferencias
    │                                      │
    ├──1:N──> transacciones <──N:1── comercios
    │
    └──1:N──> notificaciones

tasas_cambio  (tabla de apoyo, sin relaciones)
```

| Tabla | Para qué sirve |
|-------|----------------|
| `usuarios` | Quién usa el panel |
| `contactos` | Destinatarios de la *transferencia rápida* |
| `comercios` | Catálogo compartido (Amazon, PayPal, Wise...) |
| `transacciones` | El historial que se ve en la tabla principal |
| `tasas_cambio` | Conversión entre monedas (1 EUR = 1,18 USD) |
| `transferencias` | Envíos de dinero a un contacto |
| `notificaciones` | Avisos de la campana del encabezado |

Detalle campo a campo en [`docs/modelo-datos.md`](docs/modelo-datos.md).

### Decisión de diseño importante

Los importes se guardan **siempre positivos** y el signo lo aporta la columna
`tipo` (`ingreso` = +, `egreso` = −). Así la base de datos nunca contiene
importes negativos contradictorios y las sumas por tipo son inmediatas.

---

## 4. API que consume el frontend

Supabase genera automáticamente una API REST a partir del esquema. El frontend
usa estos puntos de entrada:

### Lectura de tablas y vistas

| Recurso | Uso en la interfaz |
|---------|--------------------|
| `vista_transacciones_detalle` | Tabla «Historial» (ya trae el comercio unido) |
| `contactos` | Avatares de «Transferencia rápida» |
| `comercios` | Desplegable de filtros |
| `tasas_cambio` | Texto «1 € = 1,18 $» |
| `notificaciones` | Campana del encabezado |

### Funciones RPC (lógica en el servidor)

| Función | Parámetros | Devuelve |
|---------|-----------|----------|
| `fn_volumen_pagos` | `p_usuario`, `p_dias` | Total por día para el gráfico de barras |
| `fn_resumen_usuario` | `p_usuario` | Ingresos, egresos, saldo y contadores |
| `fn_obtener_tasa` | `p_origen`, `p_destino` | Tasa de cambio (busca el par inverso si hace falta) |
| `fn_registrar_transferencia` | usuario, contacto, monto, monedas, nota | Crea transferencia + transacción + notificación de forma **atómica** |

---

## 5. Seguridad (RLS)

Todas las tablas tienen **Row Level Security activado**. Sin una política que lo
permita explícitamente, PostgreSQL rechaza la fila.

> ⚠️ **Este proyecto está en modo demo**: como no hay pantalla de login, las
> políticas permiten al rol `anon` leer y escribir (`using (true)`).
> En una aplicación real habría que activar Supabase Auth y cambiar la condición
> por `usuario_id = auth.uid()`. El archivo `003_politicas_rls.sql` incluye al
> final esas políticas ya escritas y comentadas, listas para activarlas.

Sobre las claves:

- **`anon`** — pública por diseño, viaja al navegador. Lo que protege los datos
  es RLS, no el secreto de la clave.
- **`service_role`** — secreta, **nunca** debe aparecer en el frontend ni en el
  repositorio.

---

## 6. Scripts disponibles

```bash
npm run sql        # Regenera supabase/instalacion_completa.sql
npm run verificar  # Comprueba tablas, vistas y funciones RPC contra Supabase
```

Ambos leen la configuración de `config/supabase.config.mjs`, que admite las
variables de entorno `SUPABASE_URL` y `SUPABASE_ANON_KEY` para sobrescribirla.

---

## 7. Cómo añadir un cambio al esquema

1. Crea un archivo nuevo en `supabase/migraciones/` con el siguiente número
   (`004_...sql`). **Nunca edites una migración ya ejecutada**: el historial debe
   poder reproducirse desde cero.
2. Ejecuta `npm run sql` para regenerar el archivo unificado.
3. Ejecútalo en el editor SQL de Supabase.
4. Actualiza los modelos TypeScript en
   `frontend/src/app/nucleo/modelos/` para que el tipado siga coincidiendo.

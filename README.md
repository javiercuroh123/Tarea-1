# Payline — Panel de pagos y transacciones

Aplicación web que reproduce el panel de transacciones de la maqueta de
referencia, construida con **Angular 22** y **Supabase (PostgreSQL)**.

Todo el código está comentado **en español**.

---

## 1. Puesta en marcha (3 pasos)

### Paso 1 — Crear la base de datos

1. Entra en [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor** → **New query**.
2. Abre el archivo [`backend/supabase/instalacion_completa.sql`](backend/supabase/instalacion_completa.sql).
3. Copia **todo** su contenido, pégalo en el editor y pulsa **Run**.

> Este archivo crea las 7 tablas, la vista, las funciones, la seguridad (RLS)
> y los datos de ejemplo. Es la **única** parte que no se puede automatizar
> desde aquí: crear tablas exige la clave `service_role`, que es secreta y no
> debe salir del panel de Supabase.

### Paso 2 — Comprobar que la base de datos responde

```bash
cd backend && npm run verificar
```

Debe salir `OK` en las 8 tablas/vistas y en las 2 funciones RPC.

### Paso 3 — Arrancar la aplicación

```bash
cd frontend && npm install && npm start
```

Abre <http://localhost:4200>.

---

## 2. Organización del proyecto

El repositorio separa **backend** (datos) y **frontend** (interfaz) en dos
carpetas independientes, cada una con su propio `package.json`:

```
Tarea_01/
├── backend/        → Base de datos: SQL, seguridad y scripts   (ver su README)
└── frontend/       → Aplicación Angular
```

### Estructura del frontend

```
frontend/src/
├── environments/               Configuración por entorno (URL y clave de Supabase)
├── estilos/                    Variables de diseño y mixins SCSS compartidos
└── app/
    ├── nucleo/                 «Core»: lo que existe UNA vez en toda la app
    │   ├── modelos/            Interfaces TypeScript espejo de las tablas SQL
    │   ├── servicios/          Acceso a datos y estado (señales)
    │   └── utilidades/         Funciones puras: formato, errores
    │
    ├── compartido/             Componentes de presentación reutilizables
    │   ├── componentes/        avatar, icono, tarjeta, etiqueta-estado, métrica…
    │   └── pipes/              monto, fechaTransaccion
    │
    ├── diseno/                 Estructura visual: barra lateral, encabezado, layout
    │
    └── funcionalidades/        Una carpeta por área de negocio
        ├── panel/              Pantalla de inicio con indicadores
        ├── transacciones/      Pantalla principal (la de la maqueta)
        │   ├── componentes/    transferencia-rapida, volumen-pagos, historial…
        │   └── paginas/        La página que compone esos componentes
        ├── informes/           Analítica y distribución por estado
        └── informativa/        Pantalla genérica (Ajustes, Ayuda, 404)
```

### La regla que ordena todo

```
Componente  →  Servicio  →  Supabase
```

- Un **componente** nunca habla con Supabase: pide los datos a un servicio.
- Un **servicio de dominio** (transacciones, contactos…) nunca crea su propio
  cliente: usa `SupabaseServicio`, que existe una sola vez.
- Los componentes de `compartido/` son «tontos»: reciben datos por `input()` y
  avisan por `output()`, así se pueden reutilizar en cualquier pantalla.

---

## 3. Qué hace la aplicación

| Pantalla | Contenido |
|----------|-----------|
| **Transacciones** | Transferencia rápida, gráfico de volumen e historial completo |
| **Panel** | Cuatro indicadores (ingresos, gastos, saldo, pendientes) + gráfico |
| **Informes** | Tasa de éxito, importe medio y distribución por estado |
| **Ajustes / Ayuda** | Pantallas informativas preparadas para ampliar |

### Funciones del historial

- **Búsqueda** por comercio o concepto, con retardo de 300 ms para no consultar en cada tecla.
- **Filtros** por estado (varios a la vez), tipo de movimiento y rango de fechas.
- **Ordenación** por comercio, fecha o importe (pulsando la cabecera).
- **Paginación** de 8 filas (configurable en `environment.ts`).
- **Selección múltiple** con borrado en lote.
- **Alta** de transacciones mediante formulario reactivo con validaciones.
- **Cambio de estado** y borrado desde el menú de cada fila.

Filtros, orden y paginación se resuelven **en el servidor**: el navegador nunca
descarga más de una página de resultados.

### Transferencia rápida

El control «Arrastra para enviar» exige un gesto deliberado porque enviar dinero
es irreversible. Aun así es un `<button>` real, así que también funciona con el
teclado (Intro o Espacio).

El envío llama a la función `fn_registrar_transferencia`, que crea de forma
**atómica** la transferencia, su transacción y la notificación: o se guardan las
tres cosas, o no se guarda ninguna.

---

## 4. Decisiones técnicas

| Decisión | Motivo |
|----------|--------|
| **Angular sin Zone.js** (*zoneless*) | La detección de cambios la disparan las señales: menos código descargado y menos comprobaciones innecesarias |
| **Señales** (`signal`, `computed`) en vez de RxJS para el estado | Más sencillas de leer y de depurar para estado local |
| **Carga perezosa** por ruta (`loadComponent`) | El arranque solo descarga lo imprescindible |
| **`ChangeDetectionStrategy.OnPush`** en todos los componentes | Angular solo revisa el componente si cambian sus entradas |
| **Importes positivos + columna `tipo`** | Evita importes negativos contradictorios en la base de datos |
| **Gráfico con CSS**, sin librería | Cero dependencias; cada barra es accesible con el teclado |
| **Filtrado y paginación en el servidor** | Escala igual con 20 filas que con 50.000 |
| **Formularios reactivos** en el alta | Validaciones declaradas en un solo sitio |

### Accesibilidad

- Los estados se distinguen por **color + icono + texto**, no solo por color.
- El color del texto de cada avatar se calcula según la luminancia del fondo.
- Las barras del gráfico son botones enfocables con `aria-label` descriptivo.
- La tabla usa `<th scope="col">`, `<caption>` y etiquetas en cada casilla.
- Se respeta `prefers-reduced-motion`.

---

## 5. Seguridad

Todas las tablas tienen **RLS (Row Level Security)** activado.

> ⚠️ **Modo demo:** como el ejercicio no incluye pantalla de login, las políticas
> permiten al rol público leer y escribir. En producción habría que activar
> Supabase Auth y sustituir `using (true)` por `using (usuario_id = auth.uid())`.
> Esas políticas ya están escritas y comentadas al final de
> [`backend/supabase/migraciones/003_politicas_rls.sql`](backend/supabase/migraciones/003_politicas_rls.sql).

La clave `anon` que aparece en `environment.ts` es **pública por diseño**: viaja
al navegador en cualquier aplicación de Supabase. Lo que protege los datos es
RLS, no el secreto de la clave. La clave `service_role` **nunca** debe aparecer
en el frontend.

---

## 6. Comandos

### Frontend (`cd frontend`)

```bash
npm start          # Servidor de desarrollo en http://localhost:4200
npm run build      # Compilación optimizada en dist/
npm test           # Pruebas unitarias
```

### Backend (`cd backend`)

```bash
npm run verificar  # Comprueba tablas, vistas y funciones contra Supabase
npm run sql        # Regenera supabase/instalacion_completa.sql
```

---

## 7. Solución de problemas

| Síntoma | Causa y solución |
|---------|------------------|
| «La tabla no existe todavía» | Falta el **paso 1**: ejecuta `instalacion_completa.sql` en el editor SQL de Supabase |
| Las tablas están vacías | Ejecuta solo `backend/supabase/semillas/001_datos_demo.sql` |
| «La política de seguridad (RLS) ha bloqueado la operación» | Falta ejecutar `003_politicas_rls.sql` |
| «La clave de Supabase no es válida» | Revisa `supabaseClaveAnonima` en `frontend/src/environments/` |
| No aparece ningún dato pero no hay error | El UUID de `usuarioDemoId` no coincide con el de la semilla: deben ser idénticos |

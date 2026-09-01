# Frontend — Aplicación Angular

Interfaz del panel Payline. **Angular 22**, componentes independientes
(*standalone*), señales y sin Zone.js.

> La guía completa de instalación está en el [README raíz](../README.md).
> Antes de arrancar, la base de datos debe estar creada (ver [`../backend`](../backend)).

---

## Comandos

```bash
npm install        # Instalar dependencias (solo la primera vez)
npm start          # Servidor de desarrollo → http://localhost:4200
npm run build      # Compilación optimizada en dist/
npm test           # Pruebas unitarias (Vitest)
```

---

## Dónde está cada cosa

| Carpeta | Contenido | Regla |
|---------|-----------|-------|
| `src/environments/` | URL y clave de Supabase por entorno | Nunca escribir la URL en el código |
| `src/estilos/` | Variables SCSS y mixins | Un solo sitio para colores y medidas |
| `src/app/nucleo/` | Modelos, servicios y utilidades | Existe una sola vez en toda la app |
| `src/app/compartido/` | Componentes de presentación y pipes | No conocen Supabase |
| `src/app/diseno/` | Barra lateral, encabezado y layout | Estructura común |
| `src/app/funcionalidades/` | Una carpeta por área de negocio | Cada página carga sus datos |

---

## Convenciones del código

- **Nombres en español**, igual que los comentarios: `TransaccionesServicio`,
  `barra-lateral`, `formatearMonto`.
- Sufijos: `*.modelo.ts`, `*.servicio.ts`, `*.util.ts`, `*.pipe.ts`, `*-pagina.ts`.
- Todos los componentes usan `ChangeDetectionStrategy.OnPush`.
- El estado vive en señales privadas `_x` dentro del servicio, expuestas como
  `x = this._x.asReadonly()`. Solo el servicio puede modificarlo.
- Los estilos de cada componente van en su propio `.scss`; `styles.scss` solo
  contiene normalización y utilidades globales.

## Añadir una pantalla nueva

1. Crea la carpeta en `src/app/funcionalidades/mi-seccion/`.
2. Crea el componente `mi-seccion-pagina.ts` / `.html` / `.scss`.
3. Añade la ruta en `src/app/app.routes.ts` con `loadComponent` (carga perezosa)
   y su `data: { titulo: 'Mi sección' }`, que es lo que muestra el encabezado.
4. Si debe salir en el menú, añádela a `opciones` en
   `src/app/diseno/barra-lateral/barra-lateral.ts`.

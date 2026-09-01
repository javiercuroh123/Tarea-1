import { Routes } from '@angular/router';
import { LayoutPrincipal } from './diseno/layout-principal/layout-principal';

/**
 * TABLA DE RUTAS DE LA APLICACIÓN
 * -----------------------------------------------------------------------------
 * Todas las pantallas cuelgan del `LayoutPrincipal` (barra lateral +
 * encabezado), así que se declaran como rutas HIJAS suyas.
 *
 * Dos ideas importantes:
 *
 * 1. CARGA PEREZOSA (`loadComponent`): el código de cada página se descarga solo
 *    cuando se visita. El arranque de la aplicación es más rápido porque el
 *    paquete inicial es pequeño.
 *
 * 2. `data.titulo`: cada ruta declara el texto que el encabezado mostrará como
 *    <h1>. El componente `Encabezado` lo lee de la ruta activa.
 */
export const routes: Routes = [
  {
    path: '',
    component: LayoutPrincipal,
    children: [
      // --- Redirección inicial ------------------------------------------------
      {
        path: '',
        redirectTo: 'transacciones',
        pathMatch: 'full',
      },

      // --- Panel --------------------------------------------------------------
      {
        path: 'panel',
        title: 'Panel · Payline',
        data: { titulo: 'Panel' },
        loadComponent: () =>
          import('./funcionalidades/panel/panel-pagina').then((m) => m.PanelPagina),
      },

      // --- Transacciones (pantalla principal del diseño) ----------------------
      {
        path: 'transacciones',
        title: 'Transacciones · Payline',
        data: { titulo: 'Transacciones' },
        loadComponent: () =>
          import(
            './funcionalidades/transacciones/paginas/transacciones-pagina/transacciones-pagina'
          ).then((m) => m.TransaccionesPagina),
      },

      // --- Informes -----------------------------------------------------------
      {
        path: 'informes',
        title: 'Informes · Payline',
        data: { titulo: 'Informes' },
        loadComponent: () =>
          import('./funcionalidades/informes/informes-pagina').then((m) => m.InformesPagina),
      },

      // --- Ajustes (pantalla informativa) -------------------------------------
      {
        path: 'ajustes',
        title: 'Ajustes · Payline',
        data: {
          titulo: 'Ajustes',
          encabezado: 'Ajustes de la cuenta',
          descripcion:
            'Aquí irían las preferencias del usuario: moneda base, notificaciones y seguridad. Se deja preparado para una futura ampliación.',
          icono: 'ajustes',
        },
        loadComponent: () =>
          import('./funcionalidades/informativa/informativa-pagina').then(
            (m) => m.InformativaPagina,
          ),
      },

      // --- Ayuda --------------------------------------------------------------
      {
        path: 'ayuda',
        title: 'Ayuda · Payline',
        data: {
          titulo: 'Ayuda',
          encabezado: '¿Necesitas ayuda?',
          descripcion:
            'Consulta el archivo README.md del proyecto: explica cómo instalar la base de datos en Supabase y cómo está organizado el código.',
          icono: 'ayuda',
        },
        loadComponent: () =>
          import('./funcionalidades/informativa/informativa-pagina').then(
            (m) => m.InformativaPagina,
          ),
      },

      // --- Ruta comodín: cualquier URL desconocida -----------------------------
      // Debe ir SIEMPRE la última: Angular evalúa las rutas en orden.
      {
        path: '**',
        title: 'Página no encontrada · Payline',
        data: {
          titulo: 'Página no encontrada',
          encabezado: 'Esta página no existe',
          descripcion: 'Comprueba la dirección o vuelve al panel desde la barra lateral.',
          icono: 'inbox',
        },
        loadComponent: () =>
          import('./funcionalidades/informativa/informativa-pagina').then(
            (m) => m.InformativaPagina,
          ),
      },
    ],
  },
];

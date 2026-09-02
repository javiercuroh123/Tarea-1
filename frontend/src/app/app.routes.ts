import { Routes } from '@angular/router';
import { LayoutPrincipal } from './diseno/layout-principal/layout-principal';
import { autenticacionGuard, publicoGuard } from './nucleo/guardas/autenticacion.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Payline',
    canActivate: [publicoGuard],
    loadComponent: () =>
      import(
        './funcionalidades/autenticacion/paginas/login-pagina/login-pagina'
      ).then((m) => m.LoginPagina),
  },

  {
    path: '',
    component: LayoutPrincipal,
    canActivate: [autenticacionGuard],
    children: [
      {
        path: '',
        redirectTo: 'transacciones',
        pathMatch: 'full',
      },

      {
        path: 'panel',
        title: 'Panel · Payline',
        data: { titulo: 'Panel' },
        loadComponent: () =>
          import('./funcionalidades/panel/panel-pagina').then((m) => m.PanelPagina),
      },

      {
        path: 'transacciones',
        title: 'Transacciones · Payline',
        data: { titulo: 'Transacciones' },
        loadComponent: () =>
          import(
            './funcionalidades/transacciones/paginas/transacciones-pagina/transacciones-pagina'
          ).then((m) => m.TransaccionesPagina),
      },

      {
        path: 'informes',
        title: 'Informes · Payline',
        data: { titulo: 'Informes' },
        loadComponent: () =>
          import('./funcionalidades/informes/informes-pagina').then((m) => m.InformesPagina),
      },

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

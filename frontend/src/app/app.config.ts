import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

/**
 * CONFIGURACIÓN DE LA APLICACIÓN
 * -----------------------------------------------------------------------------
 * Angular 22 arranca sin módulos (`NgModule`): los servicios globales se
 * declaran aquí como «proveedores».
 *
 * Esta aplicación es ZONELESS (no usa Zone.js): la detección de cambios la
 * disparan las señales (`signal`, `computed`), lo que reduce el tamaño del
 * paquete y hace la interfaz más eficiente.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Captura errores no controlados y los muestra en la consola.
    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes,
      // Pasa los parámetros de la URL directamente a los `input()` del componente.
      withComponentInputBinding(),
      // Al navegar, la página vuelve arriba; y al volver atrás, se restaura la
      // posición anterior.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
  ],
};

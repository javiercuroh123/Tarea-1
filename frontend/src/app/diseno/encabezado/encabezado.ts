import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NotificacionesServicio, UsuariosServicio } from '../../nucleo/servicios';
import { Avatar, Icono } from '../../compartido';

/**
 * ENCABEZADO
 * -----------------------------------------------------------------------------
 * Barra superior: título de la pantalla, campana de notificaciones y ficha del
 * usuario.
 *
 * El TÍTULO no se pasa por `input`: se lee del campo `data.titulo` de la ruta
 * activa. Así cada página declara su propio título en `app.routes.ts` y el
 * encabezado se actualiza solo al navegar.
 */
@Component({
  selector: 'app-encabezado',
  imports: [Icono, Avatar],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Encabezado {
  private readonly router = inject(Router);
  private readonly notificacionesServicio = inject(NotificacionesServicio);
  private readonly usuariosServicio = inject(UsuariosServicio);

  /** Usuario mostrado a la derecha. */
  readonly usuario = this.usuariosServicio.usuario;

  /** Notificaciones y contador de no leídas. */
  readonly notificaciones = this.notificacionesServicio.notificaciones;
  readonly sinLeer = this.notificacionesServicio.sinLeer;

  /** Controla si el desplegable de la campana está abierto. */
  readonly panelAbierto = signal(false);

  /**
   * Título de la pantalla actual.
   *
   * `toSignal` convierte el flujo de eventos del router en una señal:
   *   - `filter`    -> solo nos interesan las navegaciones terminadas
   *   - `startWith` -> emite también en la carga inicial de la página
   *   - `map`       -> extrae el título de la ruta más profunda
   */
  readonly titulo = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => this.tituloDeRutaActiva()),
    ),
    { initialValue: this.tituloDeRutaActiva() },
  );

  /** Abre o cierra el desplegable; al abrirlo, recarga los avisos. */
  alternarPanel(): void {
    const abriendo = !this.panelAbierto();
    this.panelAbierto.set(abriendo);

    if (abriendo) {
      void this.notificacionesServicio.cargar();
    }
  }

  /** Cierra el desplegable (al pulsar fuera o la tecla Escape). */
  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  /** Marca todo como leído y cierra. */
  async marcarLeidas(): Promise<void> {
    await this.notificacionesServicio.marcarTodasLeidas();
  }

  /**
   * Recorre el árbol de rutas desde la raíz hasta la hoja y se queda con el
   * último `data.titulo` que encuentre.
   *
   * Se usa `routerState.snapshot` (una foto completa del árbol en este
   * instante) en lugar de ir bajando por `ActivatedRoute.firstChild`, porque
   * durante la carga perezosa de una página la ruta hija puede existir sin
   * tener aún su instantánea creada.
   */
  private tituloDeRutaActiva(): string {
    let nodo = this.router.routerState.snapshot.root;
    let titulo = 'Payline';

    while (nodo) {
      const valor = nodo.data?.['titulo'];
      if (typeof valor === 'string') {
        titulo = valor;
      }

      if (!nodo.firstChild) {
        break;
      }
      nodo = nodo.firstChild;
    }

    return titulo;
  }
}

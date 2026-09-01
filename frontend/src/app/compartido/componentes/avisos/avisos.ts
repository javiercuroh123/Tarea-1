import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvisosServicio } from '../../../nucleo/servicios';
import { Aviso } from '../../../nucleo/modelos';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * COMPONENTE CONTENEDOR DE AVISOS (toasts)
 * -----------------------------------------------------------------------------
 * Se coloca UNA sola vez en la plantilla raíz de la aplicación. Escucha la
 * señal del `AvisosServicio` y pinta los mensajes que haya en cada momento.
 *
 * Cualquier servicio o componente puede lanzar un aviso sin conocer a este
 * componente: basta con inyectar `AvisosServicio` y llamar a `exito()` o
 * `error()`.
 */
@Component({
  selector: 'app-avisos',
  imports: [Icono],
  templateUrl: './avisos.html',
  styleUrl: './avisos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avisos {
  private readonly servicio = inject(AvisosServicio);

  /** Lista reactiva de avisos visibles. */
  readonly avisos = this.servicio.avisos;

  /** Icono correspondiente a cada tipo de aviso. */
  icono(tipo: Aviso['tipo']): NombreIcono {
    switch (tipo) {
      case 'exito':
        return 'check-circulo';
      case 'error':
        return 'x-circulo';
      default:
        return 'campana';
    }
  }

  /** Cierra el aviso al pulsar la «x». */
  cerrar(id: number): void {
    this.servicio.cerrar(id);
  }
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * COMPONENTE ESTADO VACÍO
 * -----------------------------------------------------------------------------
 * Mensaje centrado que se muestra cuando una lista no tiene resultados o
 * cuando ha fallado la carga. Evita dejar un hueco en blanco sin explicación.
 *
 * El botón de acción es opcional: solo aparece si se le pasa `textoAccion`.
 */
@Component({
  selector: 'app-estado-vacio',
  imports: [Icono],
  templateUrl: './estado-vacio.html',
  styleUrl: './estado-vacio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoVacio {
  /** Icono grande de la parte superior. */
  readonly icono = input<NombreIcono>('inbox');

  /** Título principal del mensaje. */
  readonly titulo = input.required<string>();

  /** Texto explicativo opcional. */
  readonly descripcion = input('');

  /** Si tiene valor, se dibuja un botón con este texto. */
  readonly textoAccion = input('');

  /** Variante roja para los errores. */
  readonly esError = input(false);

  /** Se emite al pulsar el botón. El componente padre decide qué hacer. */
  readonly accion = output<void>();
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ETIQUETAS_ESTADO, EstadoTransaccion } from '../../../nucleo/modelos';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * COMPONENTE ETIQUETA DE ESTADO
 * -----------------------------------------------------------------------------
 * La «píldora» de color de la columna Estado: Completada (verde),
 * Pendiente (ámbar) o Fallida (rojo).
 *
 * Cada estado lleva SU PROPIO ICONO además del color. Es una decisión de
 * accesibilidad: quien no distingue bien los colores sigue diferenciando los
 * estados por la forma del icono y por el texto.
 */
@Component({
  selector: 'app-etiqueta-estado',
  imports: [Icono],
  templateUrl: './etiqueta-estado.html',
  styleUrl: './etiqueta-estado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtiquetaEstado {
  /** Estado a representar. */
  readonly estado = input.required<EstadoTransaccion>();

  /** Texto en español que se muestra dentro de la píldora. */
  readonly texto = computed(() => ETIQUETAS_ESTADO[this.estado()]);

  /** Icono correspondiente al estado. */
  readonly icono = computed<NombreIcono>(() => {
    switch (this.estado()) {
      case 'completada':
        return 'check-circulo';
      case 'pendiente':
        return 'reloj';
      case 'fallida':
        return 'x-circulo';
    }
  });
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { colorTextoSobre, iniciales } from '../../../nucleo/utilidades/formato.util';

/**
 * COMPONENTE AVATAR
 * -----------------------------------------------------------------------------
 * Círculo con la foto de una persona o comercio. Si no hay foto (`url` nula),
 * dibuja sus INICIALES sobre el color corporativo.
 *
 * El color del texto se calcula automáticamente (blanco o negro) según la
 * luminancia del fondo, para que siempre haya contraste suficiente aunque el
 * color venga de la base de datos.
 *
 * Uso:  <app-avatar nombre="Amazon" [color]="'#FF9900'" [tamano]="40" />
 */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  /** Nombre completo: de aquí salen las iniciales y el texto alternativo. */
  readonly nombre = input.required<string>();

  /** URL de la imagen. Si es null se pintan las iniciales. */
  readonly url = input<string | null>(null);

  /** Color de fondo cuando no hay imagen. */
  readonly color = input<string>('#5B4DF0');

  /** Diámetro en píxeles. */
  readonly tamano = input(40);

  /** Anillo blanco alrededor (se usa en la fila de contactos superpuestos). */
  readonly conBorde = input(false);

  /** Iniciales calculadas a partir del nombre. */
  readonly textoIniciales = computed(() => iniciales(this.nombre()));

  /** Blanco o negro, el que mejor contraste con el fondo. */
  readonly colorTexto = computed(() => colorTextoSobre(this.color()));

  /** El tamaño de fuente se ajusta al diámetro del círculo. */
  readonly tamanoFuente = computed(() => Math.round(this.tamano() * 0.38));
}

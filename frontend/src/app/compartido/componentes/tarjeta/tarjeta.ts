import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * COMPONENTE TARJETA
 * -----------------------------------------------------------------------------
 * Contenedor blanco con esquinas redondeadas que envuelve cada bloque del
 * panel. Unifica márgenes, sombras y la cabecera con el título.
 *
 * Usa PROYECCIÓN DE CONTENIDO (`ng-content`) en dos zonas:
 *   - `[acciones]` -> botones que van a la derecha del título.
 *   - por defecto  -> el cuerpo de la tarjeta.
 *
 * Uso:
 *   <app-tarjeta titulo="Volumen de pagos">
 *     <button acciones>...</button>
 *     <p>Contenido</p>
 *   </app-tarjeta>
 */
@Component({
  selector: 'app-tarjeta',
  templateUrl: './tarjeta.html',
  styleUrl: './tarjeta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tarjeta {
  /** Título de la cabecera. Si se deja vacío, la cabecera no se dibuja. */
  readonly titulo = input('');

  /** Muestra el asa de arrastre decorativa que aparece en el diseño. */
  readonly conAsa = input(false);

  /** Quita el relleno interior (útil cuando dentro va una tabla a sangre). */
  readonly sinRelleno = input(false);
}

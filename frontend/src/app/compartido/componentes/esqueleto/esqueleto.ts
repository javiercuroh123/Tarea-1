import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * COMPONENTE ESQUELETO DE CARGA
 * -----------------------------------------------------------------------------
 * Bloques grises animados que ocupan el sitio del contenido mientras llega.
 *
 * Se prefiere a un icono giratorio porque evita el «salto» del diseño: la
 * página ya tiene la forma final antes de que lleguen los datos.
 *
 * Uso:  <app-esqueleto [filas]="5" alto="44px" />
 */
@Component({
  selector: 'app-esqueleto',
  templateUrl: './esqueleto.html',
  styleUrl: './esqueleto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Esqueleto {
  /** Cuántas barras se dibujan. */
  readonly filas = input(3);

  /** Alto de cada barra (cualquier medida CSS válida). */
  readonly alto = input('16px');

  /** Redondeo de las barras. */
  readonly radio = input('8px');

  /**
   * Array auxiliar para poder recorrer con @for.
   * `computed` lo recalcula solo si cambia el número de filas.
   */
  readonly listaFilas = computed(() => Array.from({ length: this.filas() }, (_, i) => i));
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-esqueleto',
  templateUrl: './esqueleto.html',
  styleUrl: './esqueleto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Esqueleto {
  readonly filas = input(3);

  readonly alto = input('16px');

  readonly radio = input('8px');

  readonly listaFilas = computed(() => Array.from({ length: this.filas() }, (_, i) => i));
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { colorTextoSobre, iniciales } from '../../../nucleo/utilidades/formato.util';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly nombre = input.required<string>();

  readonly url = input<string | null>(null);

  readonly color = input<string>('#5B4DF0');

  readonly tamano = input(40);

  readonly conBorde = input(false);

  readonly textoIniciales = computed(() => iniciales(this.nombre()));

  readonly colorTexto = computed(() => colorTextoSobre(this.color()));

  readonly tamanoFuente = computed(() => Math.round(this.tamano() * 0.38));
}

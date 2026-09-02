import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-tarjeta',
  templateUrl: './tarjeta.html',
  styleUrl: './tarjeta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tarjeta {
  readonly titulo = input('');

  readonly conAsa = input(false);

  readonly sinRelleno = input(false);
}

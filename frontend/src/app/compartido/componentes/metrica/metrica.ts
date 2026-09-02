import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

@Component({
  selector: 'app-metrica',
  imports: [Icono],
  templateUrl: './metrica.html',
  styleUrl: './metrica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Metrica {
  readonly etiqueta = input.required<string>();

  readonly valor = input.required<string>();

  readonly icono = input<NombreIcono>('grafico');

  readonly color = input('var(--color-violeta)');

  readonly detalle = input('');
}

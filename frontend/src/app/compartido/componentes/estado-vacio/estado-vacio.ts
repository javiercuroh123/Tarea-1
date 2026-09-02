import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

@Component({
  selector: 'app-estado-vacio',
  imports: [Icono],
  templateUrl: './estado-vacio.html',
  styleUrl: './estado-vacio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoVacio {
  readonly icono = input<NombreIcono>('inbox');

  readonly titulo = input.required<string>();

  readonly descripcion = input('');

  readonly textoAccion = input('');

  readonly esError = input(false);

  readonly accion = output<void>();
}

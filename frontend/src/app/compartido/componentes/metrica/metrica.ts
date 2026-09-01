import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * COMPONENTE MÉTRICA
 * -----------------------------------------------------------------------------
 * Tarjeta pequeña con un indicador: icono, etiqueta y valor destacado.
 * Se usa en el panel y en los informes.
 *
 * Recibe el valor YA FORMATEADO como texto. Así el mismo componente sirve para
 * importes, recuentos o porcentajes sin saber nada de monedas.
 */
@Component({
  selector: 'app-metrica',
  imports: [Icono],
  templateUrl: './metrica.html',
  styleUrl: './metrica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Metrica {
  /** Texto descriptivo: «Ingresos», «Gastos»… */
  readonly etiqueta = input.required<string>();

  /** Valor ya formateado que se muestra en grande. */
  readonly valor = input.required<string>();

  /** Icono de la esquina. */
  readonly icono = input<NombreIcono>('grafico');

  /** Color de acento del icono (cualquier color CSS válido). */
  readonly color = input('var(--color-violeta)');

  /** Texto pequeño opcional bajo el valor. */
  readonly detalle = input('');
}

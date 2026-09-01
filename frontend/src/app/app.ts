import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Avisos } from './compartido';

/**
 * COMPONENTE RAÍZ
 * -----------------------------------------------------------------------------
 * Es deliberadamente mínimo: solo contiene el punto de montaje del enrutador y
 * el contenedor de avisos emergentes, que debe existir una única vez en toda
 * la aplicación.
 *
 * Toda la estructura visual (barra lateral, encabezado) vive en
 * `LayoutPrincipal`, que es el componente de la ruta padre.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Avisos],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}

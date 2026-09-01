import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icono, NombreIcono } from '../../compartido';

/** Estructura de cada botón del menú. */
interface OpcionMenu {
  /** Ruta a la que navega. */
  ruta: string;
  /** Icono que se muestra. */
  icono: NombreIcono;
  /** Texto para lectores de pantalla y para el globo informativo. */
  etiqueta: string;
}

/**
 * BARRA LATERAL
 * -----------------------------------------------------------------------------
 * Menú vertical de iconos. La opción activa se resalta automáticamente gracias
 * a `routerLinkActive`, así que no hay que guardar en ningún sitio «qué página
 * estoy viendo»: la fuente de verdad es la URL.
 */
@Component({
  selector: 'app-barra-lateral',
  imports: [RouterLink, RouterLinkActive, Icono],
  templateUrl: './barra-lateral.html',
  styleUrl: './barra-lateral.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraLateral {
  /** Opciones principales (parte superior). */
  readonly opciones: readonly OpcionMenu[] = [
    { ruta: '/panel', icono: 'cuadricula', etiqueta: 'Panel' },
    { ruta: '/transacciones', icono: 'lista', etiqueta: 'Transacciones' },
    { ruta: '/informes', icono: 'documento', etiqueta: 'Informes' },
  ];

  /** Opciones secundarias (parte inferior). */
  readonly opcionesInferiores: readonly OpcionMenu[] = [
    { ruta: '/ajustes', icono: 'ajustes', etiqueta: 'Ajustes' },
    { ruta: '/ayuda', icono: 'ayuda', etiqueta: 'Ayuda' },
  ];
}

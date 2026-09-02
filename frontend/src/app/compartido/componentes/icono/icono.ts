import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Nombres admitidos por el componente de icono. */
export type NombreIcono =
  | 'cuadricula'
  | 'lista'
  | 'documento'
  | 'ajustes'
  | 'ayuda'
  | 'campana'
  | 'buscar'
  | 'filtro'
  | 'flechas-derecha'
  | 'intercambio'
  | 'chevron-abajo'
  | 'chevron-izquierda'
  | 'chevron-derecha'
  | 'mas'
  | 'puntos'
  | 'cerrar'
  | 'check'
  | 'check-circulo'
  | 'reloj'
  | 'x-circulo'
  | 'orden'
  | 'papelera'
  | 'enlace'
  | 'usuario'
  | 'grafico'
  | 'inbox'
  | 'salir'
  | 'candado'
  | 'correo';

/**
 * COMPONENTE ICONO
 * -----------------------------------------------------------------------------
 * Dibuja iconos SVG en línea. Ventajas frente a una fuente de iconos o a
 * imágenes sueltas:
 *   - No hay peticiones extra ni dependencias externas.
 *   - Heredan el color del texto (`currentColor`), así que combinan solos.
 *   - Escalan sin perder nitidez.
 *
 * Uso:  <app-icono nombre="campana" [tamano]="20" />
 */
@Component({
  selector: 'app-icono',
  templateUrl: './icono.html',
  styleUrl: './icono.scss',
  // OnPush: Angular solo revisa este componente si cambian sus entradas.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icono {
  /** Icono a dibujar. Es obligatorio. */
  readonly nombre = input.required<NombreIcono>();

  /** Tamaño en píxeles (ancho y alto). */
  readonly tamano = input(20);

  /** Grosor del trazo. */
  readonly grosor = input(1.8);
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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

@Component({
  selector: 'app-icono',
  templateUrl: './icono.html',
  styleUrl: './icono.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();

  readonly tamano = input(20);

  readonly grosor = input(1.8);
}

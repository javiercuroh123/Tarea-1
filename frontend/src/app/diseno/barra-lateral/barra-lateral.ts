import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icono, NombreIcono } from '../../compartido';
import { AutenticacionServicio } from '../../nucleo/servicios';

interface OpcionMenu {
  ruta: string;
  icono: NombreIcono;
  etiqueta: string;
}

@Component({
  selector: 'app-barra-lateral',
  imports: [RouterLink, RouterLinkActive, Icono],
  templateUrl: './barra-lateral.html',
  styleUrl: './barra-lateral.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraLateral {
  private readonly auth = inject(AutenticacionServicio);

  readonly opciones: readonly OpcionMenu[] = [
    { ruta: '/panel', icono: 'cuadricula', etiqueta: 'Panel' },
    { ruta: '/transacciones', icono: 'lista', etiqueta: 'Transacciones' },
    { ruta: '/informes', icono: 'documento', etiqueta: 'Informes' },
  ];

  readonly opcionesInferiores: readonly OpcionMenu[] = [
    { ruta: '/ajustes', icono: 'ajustes', etiqueta: 'Ajustes' },
    { ruta: '/ayuda', icono: 'ayuda', etiqueta: 'Ayuda' },
  ];

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
  }
}

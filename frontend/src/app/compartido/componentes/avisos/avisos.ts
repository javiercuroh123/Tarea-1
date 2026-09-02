import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvisosServicio } from '../../../nucleo/servicios';
import { Aviso } from '../../../nucleo/modelos';
import { Icono, NombreIcono } from '../icono/icono';

@Component({
  selector: 'app-avisos',
  imports: [Icono],
  templateUrl: './avisos.html',
  styleUrl: './avisos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avisos {
  private readonly servicio = inject(AvisosServicio);

  readonly avisos = this.servicio.avisos;

  icono(tipo: Aviso['tipo']): NombreIcono {
    switch (tipo) {
      case 'exito':
        return 'check-circulo';
      case 'error':
        return 'x-circulo';
      default:
        return 'campana';
    }
  }

  cerrar(id: number): void {
    this.servicio.cerrar(id);
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificacionesServicio, UsuariosServicio } from '../../nucleo/servicios';
import { BarraLateral } from '../barra-lateral/barra-lateral';
import { Encabezado } from '../encabezado/encabezado';

@Component({
  selector: 'app-layout-principal',
  imports: [RouterOutlet, BarraLateral, Encabezado],
  templateUrl: './layout-principal.html',
  styleUrl: './layout-principal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPrincipal implements OnInit {
  private readonly usuarios = inject(UsuariosServicio);
  private readonly notificaciones = inject(NotificacionesServicio);

  ngOnInit(): void {
    void Promise.all([this.usuarios.cargar(), this.notificaciones.cargar()]);
  }
}

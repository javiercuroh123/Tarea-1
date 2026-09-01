import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificacionesServicio, UsuariosServicio } from '../../nucleo/servicios';
import { BarraLateral } from '../barra-lateral/barra-lateral';
import { Encabezado } from '../encabezado/encabezado';

/**
 * LAYOUT PRINCIPAL
 * -----------------------------------------------------------------------------
 * Estructura común a todas las pantallas: barra lateral + encabezado + el
 * contenido que corresponda a la ruta (`<router-outlet>`).
 *
 * Aquí se cargan los datos GLOBALES (usuario y notificaciones), que hacen falta
 * en todas las pantallas. Los datos propios de cada página los carga la propia
 * página, para no pedir cosas que quizá no se usen.
 */
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

  /**
   * `ngOnInit` se ejecuta una vez, cuando el componente ya existe.
   * Las dos cargas van en paralelo porque no dependen una de otra.
   */
  ngOnInit(): void {
    void Promise.all([this.usuarios.cargar(), this.notificaciones.cargar()]);
  }
}

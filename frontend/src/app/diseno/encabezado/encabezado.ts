import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AutenticacionServicio, NotificacionesServicio, UsuariosServicio } from '../../nucleo/servicios';
import { Avatar, Icono } from '../../compartido';

@Component({
  selector: 'app-encabezado',
  imports: [Icono, Avatar],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Encabezado {
  private readonly router = inject(Router);
  private readonly notificacionesServicio = inject(NotificacionesServicio);
  private readonly usuariosServicio = inject(UsuariosServicio);
  private readonly auth = inject(AutenticacionServicio);

  readonly usuario = this.usuariosServicio.usuario;

  readonly notificaciones = this.notificacionesServicio.notificaciones;
  readonly sinLeer = this.notificacionesServicio.sinLeer;

  readonly panelAbierto = signal(false);

  readonly titulo = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => this.tituloDeRutaActiva()),
    ),
    { initialValue: this.tituloDeRutaActiva() },
  );

  alternarPanel(): void {
    const abriendo = !this.panelAbierto();
    this.panelAbierto.set(abriendo);

    if (abriendo) {
      void this.notificacionesServicio.cargar();
    }
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  async marcarLeidas(): Promise<void> {
    await this.notificacionesServicio.marcarTodasLeidas();
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
  }

  private tituloDeRutaActiva(): string {
    let nodo = this.router.routerState.snapshot.root;
    let titulo = 'Payline';

    while (nodo) {
      const valor = nodo.data?.['titulo'];
      if (typeof valor === 'string') {
        titulo = valor;
      }

      if (!nodo.firstChild) {
        break;
      }
      nodo = nodo.firstChild;
    }

    return titulo;
  }
}

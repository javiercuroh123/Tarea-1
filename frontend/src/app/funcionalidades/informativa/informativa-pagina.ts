import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EstadoVacio, Tarjeta } from '../../compartido';
import { NombreIcono } from '../../compartido';

@Component({
  selector: 'app-informativa-pagina',
  imports: [Tarjeta, EstadoVacio],
  templateUrl: './informativa-pagina.html',
  styleUrl: './informativa-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformativaPagina {
  private readonly ruta = inject(ActivatedRoute);

  private readonly datos = this.ruta.snapshot.data;

  readonly titulo = (this.datos['encabezado'] as string) ?? 'Sección en construcción';
  readonly descripcion = (this.datos['descripcion'] as string) ?? '';
  readonly icono = (this.datos['icono'] as NombreIcono) ?? 'ajustes';
}

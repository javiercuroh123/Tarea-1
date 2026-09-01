import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EstadoVacio, Tarjeta } from '../../compartido';
import { NombreIcono } from '../../compartido';

/**
 * PÁGINA INFORMATIVA
 * -----------------------------------------------------------------------------
 * Pantalla genérica reutilizada por varias rutas (Ajustes, Ayuda y la ruta
 * comodín de «página no encontrada»).
 *
 * El contenido viene del campo `data` de la ruta, así que añadir una pantalla
 * informativa nueva no requiere crear otro componente: basta con declarar la
 * ruta en `app.routes.ts`.
 */
@Component({
  selector: 'app-informativa-pagina',
  imports: [Tarjeta, EstadoVacio],
  templateUrl: './informativa-pagina.html',
  styleUrl: './informativa-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformativaPagina {
  private readonly ruta = inject(ActivatedRoute);

  /** Datos declarados en la ruta (`data: { ... }`). */
  private readonly datos = this.ruta.snapshot.data;

  readonly titulo = (this.datos['encabezado'] as string) ?? 'Sección en construcción';
  readonly descripcion = (this.datos['descripcion'] as string) ?? '';
  readonly icono = (this.datos['icono'] as NombreIcono) ?? 'ajustes';
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UsuariosServicio } from '../../nucleo/servicios';
import { Esqueleto, Metrica, Tarjeta } from '../../compartido';
import { formatearMonto } from '../../nucleo/utilidades/formato.util';

/** Una barra de la distribución por estado. */
interface BarraEstado {
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

/**
 * PÁGINA DE INFORMES
 * -----------------------------------------------------------------------------
 * Resumen analítico a partir de la RPC `fn_resumen_usuario`: indicadores
 * principales y reparto de los movimientos por estado.
 *
 * Los cálculos que se ven aquí (porcentajes) se hacen en el navegador porque
 * parten de cuatro números que ya vienen agregados del servidor. La regla que
 * seguimos: AGREGAR en la base de datos, PRESENTAR en el navegador.
 */
@Component({
  selector: 'app-informes-pagina',
  imports: [Metrica, Tarjeta, Esqueleto],
  templateUrl: './informes-pagina.html',
  styleUrl: './informes-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformesPagina {
  private readonly usuarios = inject(UsuariosServicio);

  readonly resumen = this.usuarios.resumen;
  readonly cargando = this.usuarios.cargando;

  /** Total de movimientos, base para los porcentajes. */
  readonly totalMovimientos = computed(() => {
    const r = this.resumen();
    return r ? r.numCompletadas + r.numPendientes + r.numFallidas : 0;
  });

  /** Barras de la distribución por estado. */
  readonly distribucion = computed<BarraEstado[]>(() => {
    const r = this.resumen();
    const total = this.totalMovimientos();

    if (!r || total === 0) {
      return [];
    }

    const construir = (etiqueta: string, cantidad: number, color: string): BarraEstado => ({
      etiqueta,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 100),
      color,
    });

    return [
      construir('Completadas', r.numCompletadas, 'var(--color-exito)'),
      construir('Pendientes', r.numPendientes, 'var(--color-aviso)'),
      construir('Fallidas', r.numFallidas, 'var(--color-error)'),
    ];
  });

  /** Tasa de éxito: completadas sobre el total. */
  readonly tasaExito = computed(() => {
    const r = this.resumen();
    const total = this.totalMovimientos();
    if (!r || total === 0) {
      return '—';
    }
    return `${Math.round((r.numCompletadas / total) * 100)} %`;
  });

  /** Importe medio por movimiento completado. */
  readonly importeMedio = computed(() => {
    const r = this.resumen();
    if (!r || r.numCompletadas === 0) {
      return '—';
    }
    return formatearMonto((r.totalIngresos + r.totalEgresos) / r.numCompletadas, 'USD');
  });

  readonly ingresos = computed(() => this.formatear(this.resumen()?.totalIngresos));
  readonly egresos = computed(() => this.formatear(this.resumen()?.totalEgresos));

  private formatear(valor: number | undefined): string {
    return valor === undefined ? '—' : formatearMonto(valor, 'USD');
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UsuariosServicio } from '../../nucleo/servicios';
import { Esqueleto, Metrica, Tarjeta } from '../../compartido';
import { formatearMonto } from '../../nucleo/utilidades/formato.util';

interface BarraEstado {
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

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

  readonly totalMovimientos = computed(() => {
    const r = this.resumen();
    return r ? r.numCompletadas + r.numPendientes + r.numFallidas : 0;
  });

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

  readonly tasaExito = computed(() => {
    const r = this.resumen();
    const total = this.totalMovimientos();
    if (!r || total === 0) {
      return '—';
    }
    return `${Math.round((r.numCompletadas / total) * 100)} %`;
  });

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

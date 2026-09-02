import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TransaccionesServicio } from '../../../../nucleo/servicios';
import { Esqueleto, Icono, Tarjeta } from '../../../../compartido';
import { formatearCompacto, formatearMonto } from '../../../../nucleo/utilidades/formato.util';

@Component({
  selector: 'app-volumen-pagos',
  imports: [Tarjeta, Icono, Esqueleto],
  templateUrl: './volumen-pagos.html',
  styleUrl: './volumen-pagos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolumenPagos implements OnInit {
  private readonly transacciones = inject(TransaccionesServicio);

  readonly puntos = this.transacciones.volumen;
  readonly estado = this.transacciones.estadoVolumen;
  readonly maximo = this.transacciones.volumenMaximo;

  readonly indiceActivo = signal<number | null>(null);

  readonly promedio = computed(() => {
    const lista = this.puntos();
    if (!lista.length) {
      return 0;
    }
    const suma = lista.reduce((acumulado, punto) => acumulado + punto.total, 0);
    return suma / lista.length;
  });

  readonly totalPeriodo = computed(() =>
    this.puntos().reduce((acumulado, punto) => acumulado + punto.total, 0),
  );

  readonly alturaPromedio = computed(() => {
    const maximo = this.maximo();
    return maximo > 0 ? (this.promedio() / maximo) * 100 : 0;
  });

  readonly puntoActivo = computed(() => {
    const indice = this.indiceActivo();
    return indice === null ? null : (this.puntos()[indice] ?? null);
  });

  ngOnInit(): void {
    void this.transacciones.cargarVolumen();
  }

  altura(total: number): number {
    const maximo = this.maximo();
    if (maximo <= 0) {
      return 4;
    }
    return Math.max(4, (total / maximo) * 100);
  }

  activar(indice: number): void {
    this.indiceActivo.set(indice);
  }

  desactivar(): void {
    this.indiceActivo.set(null);
  }

  formatear(total: number): string {
    return formatearMonto(total, 'USD');
  }

  formatearEje(total: number): string {
    return formatearCompacto(total);
  }
}

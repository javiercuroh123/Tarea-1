import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TransaccionesServicio } from '../../../../nucleo/servicios';
import { Esqueleto, Icono, Tarjeta } from '../../../../compartido';
import { formatearCompacto, formatearMonto } from '../../../../nucleo/utilidades/formato.util';

/**
 * GRÁFICO DE VOLUMEN DE PAGOS
 * -----------------------------------------------------------------------------
 * Barras verticales con el total de cada día, más una línea discontinua con la
 * media del periodo.
 *
 * Está dibujado con CSS (no con una librería de gráficos) a propósito:
 *   - cero dependencias y cero kilobytes extra de JavaScript,
 *   - se adapta solo al ancho disponible,
 *   - cada barra es un `<button>`, así que se puede recorrer con el tabulador
 *     y el lector de pantalla anuncia el día y el importe.
 *
 * Los datos vienen ya agregados por día desde la RPC `fn_volumen_pagos`.
 */
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

  /** Índice de la barra sobre la que está el puntero (null = ninguna). */
  readonly indiceActivo = signal<number | null>(null);

  /** Media del periodo: la línea discontinua horizontal. */
  readonly promedio = computed(() => {
    const lista = this.puntos();
    if (!lista.length) {
      return 0;
    }
    const suma = lista.reduce((acumulado, punto) => acumulado + punto.total, 0);
    return suma / lista.length;
  });

  /** Suma total del periodo, que se muestra sobre el gráfico. */
  readonly totalPeriodo = computed(() =>
    this.puntos().reduce((acumulado, punto) => acumulado + punto.total, 0),
  );

  /** Altura de la línea de la media, en % de la zona del gráfico. */
  readonly alturaPromedio = computed(() => {
    const maximo = this.maximo();
    return maximo > 0 ? (this.promedio() / maximo) * 100 : 0;
  });

  /** Punto sobre el que está el puntero, para el globo informativo. */
  readonly puntoActivo = computed(() => {
    const indice = this.indiceActivo();
    return indice === null ? null : (this.puntos()[indice] ?? null);
  });

  ngOnInit(): void {
    void this.transacciones.cargarVolumen();
  }

  /**
   * Altura de una barra en porcentaje.
   * Se garantiza un mínimo del 4 % para que los días sin movimientos sigan
   * mostrando una marca visible en lugar de desaparecer.
   */
  altura(total: number): number {
    const maximo = this.maximo();
    if (maximo <= 0) {
      return 4;
    }
    return Math.max(4, (total / maximo) * 100);
  }

  /** Marca la barra activa (al pasar el puntero o al enfocarla con el teclado). */
  activar(indice: number): void {
    this.indiceActivo.set(indice);
  }

  /** Quita la marca al salir. */
  desactivar(): void {
    this.indiceActivo.set(null);
  }

  /** Importe con formato para el globo informativo. */
  formatear(total: number): string {
    return formatearMonto(total, 'USD');
  }

  /** Importe abreviado para el eje vertical: 2340 -> «2.3K». */
  formatearEje(total: number): string {
    return formatearCompacto(total);
  }
}

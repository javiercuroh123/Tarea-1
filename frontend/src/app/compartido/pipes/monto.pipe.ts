import { Pipe, PipeTransform } from '@angular/core';
import { CodigoMoneda } from '../../nucleo/modelos';
import { formatearMonto } from '../../nucleo/utilidades/formato.util';

/**
 * PIPE `monto`
 * -----------------------------------------------------------------------------
 * Da formato a un importe directamente desde la plantilla:
 *
 *     {{ transaccion.monto | monto: transaccion.moneda : true }}   ->  -$150.00
 *
 * Es `pure` (valor por defecto): Angular solo lo vuelve a ejecutar si cambian
 * sus argumentos, no en cada ciclo de detección de cambios. Eso lo hace barato
 * aunque aparezca en cientos de filas.
 */
@Pipe({ name: 'monto' })
export class MontoPipe implements PipeTransform {
  /**
   * @param valor    Importe positivo.
   * @param moneda   Código ISO de la moneda.
   * @param negativo Si es true antepone el signo menos.
   */
  transform(valor: number | null | undefined, moneda: CodigoMoneda = 'USD', negativo = false): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return formatearMonto(valor, moneda, negativo);
  }
}

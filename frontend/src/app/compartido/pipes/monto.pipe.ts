import { Pipe, PipeTransform } from '@angular/core';
import { CodigoMoneda } from '../../nucleo/modelos';
import { formatearMonto } from '../../nucleo/utilidades/formato.util';

@Pipe({ name: 'monto' })
export class MontoPipe implements PipeTransform {
  transform(valor: number | null | undefined, moneda: CodigoMoneda = 'USD', negativo = false): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return formatearMonto(valor, moneda, negativo);
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { formatearFechaHora } from '../../nucleo/utilidades/formato.util';

@Pipe({ name: 'fechaTransaccion' })
export class FechaTransaccionPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    return formatearFechaHora(valor);
  }
}

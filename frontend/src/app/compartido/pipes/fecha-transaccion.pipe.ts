import { Pipe, PipeTransform } from '@angular/core';
import { formatearFechaHora } from '../../nucleo/utilidades/formato.util';

/**
 * PIPE `fechaTransaccion`
 * -----------------------------------------------------------------------------
 * Convierte la marca de tiempo ISO que devuelve Supabase en el formato que se
 * ve en la tabla:
 *
 *     {{ transaccion.fecha | fechaTransaccion }}   ->  «9 sept 2025, 16:30»
 *
 * Se hace con un pipe propio y no con el `DatePipe` de Angular porque
 * queremos un formato mixto (fecha corta + hora en 24 h) que sería incómodo de
 * repetir en cada plantilla.
 */
@Pipe({ name: 'fechaTransaccion' })
export class FechaTransaccionPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    return formatearFechaHora(valor);
  }
}

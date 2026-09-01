import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TransferenciaRapida } from '../../componentes/transferencia-rapida/transferencia-rapida';
import { VolumenPagos } from '../../componentes/volumen-pagos/volumen-pagos';
import { HistorialTransacciones } from '../../componentes/historial-transacciones/historial-transacciones';

/**
 * PÁGINA DE TRANSACCIONES
 * -----------------------------------------------------------------------------
 * Reproduce la pantalla del diseño de referencia:
 *
 *   ┌──────────────┬────────────────────────────────┐
 *   │ Transferencia│                                │
 *   │   rápida     │        Historial               │
 *   ├──────────────┤                                │
 *   │ Volumen de   │                                │
 *   │   pagos      │                                │
 *   └──────────────┴────────────────────────────────┘
 *
 * La página solo COMPONE: cada bloque carga sus propios datos. Así, si mañana
 * se quita el gráfico, no hay que tocar nada más.
 */
@Component({
  selector: 'app-transacciones-pagina',
  imports: [TransferenciaRapida, VolumenPagos, HistorialTransacciones],
  templateUrl: './transacciones-pagina.html',
  styleUrl: './transacciones-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransaccionesPagina {}

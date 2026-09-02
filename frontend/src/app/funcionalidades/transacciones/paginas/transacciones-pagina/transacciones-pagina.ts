import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TransferenciaRapida } from '../../componentes/transferencia-rapida/transferencia-rapida';
import { VolumenPagos } from '../../componentes/volumen-pagos/volumen-pagos';
import { HistorialTransacciones } from '../../componentes/historial-transacciones/historial-transacciones';

@Component({
  selector: 'app-transacciones-pagina',
  imports: [TransferenciaRapida, VolumenPagos, HistorialTransacciones],
  templateUrl: './transacciones-pagina.html',
  styleUrl: './transacciones-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransaccionesPagina {}

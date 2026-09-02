import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UsuariosServicio } from '../../nucleo/servicios';
import { Metrica } from '../../compartido';
import { formatearMonto } from '../../nucleo/utilidades/formato.util';
import { TransferenciaRapida } from '../transacciones/componentes/transferencia-rapida/transferencia-rapida';
import { VolumenPagos } from '../transacciones/componentes/volumen-pagos/volumen-pagos';

@Component({
  selector: 'app-panel-pagina',
  imports: [Metrica, TransferenciaRapida, VolumenPagos],
  templateUrl: './panel-pagina.html',
  styleUrl: './panel-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelPagina {
  private readonly usuarios = inject(UsuariosServicio);

  readonly resumen = this.usuarios.resumen;
  readonly usuario = this.usuarios.usuario;

  readonly saludo = computed(() => {
    const nombre = this.usuario()?.nombre_completo.split(' ')[0];
    return nombre ? `Hola, ${nombre}` : 'Hola';
  });

  readonly ingresos = computed(() => this.formatear(this.resumen()?.totalIngresos));
  readonly egresos = computed(() => this.formatear(this.resumen()?.totalEgresos));
  readonly saldo = computed(() => this.formatear(this.resumen()?.saldo));

  readonly pendientes = computed(() => String(this.resumen()?.numPendientes ?? 0));

  readonly detallePendientes = computed(() => {
    const fallidas = this.resumen()?.numFallidas ?? 0;
    return `${fallidas} fallida(s)`;
  });

  private formatear(valor: number | undefined): string {
    return valor === undefined ? '—' : formatearMonto(valor, 'USD');
  }
}

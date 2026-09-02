import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ETIQUETAS_ESTADO, EstadoTransaccion } from '../../../nucleo/modelos';
import { Icono, NombreIcono } from '../icono/icono';

@Component({
  selector: 'app-etiqueta-estado',
  imports: [Icono],
  templateUrl: './etiqueta-estado.html',
  styleUrl: './etiqueta-estado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtiquetaEstado {
  readonly estado = input.required<EstadoTransaccion>();

  readonly texto = computed(() => ETIQUETAS_ESTADO[this.estado()]);

  readonly icono = computed<NombreIcono>(() => {
    switch (this.estado()) {
      case 'completada':
        return 'check-circulo';
      case 'pendiente':
        return 'reloj';
      case 'fallida':
        return 'x-circulo';
    }
  });
}

import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import {
  ETIQUETAS_ESTADO,
  EstadoTransaccion,
  FiltrosTransaccion,
  TipoTransaccion,
} from '../../../../nucleo/modelos';
import { Icono } from '../../../../compartido';

@Component({
  selector: 'app-filtros-historial',
  imports: [Icono],
  templateUrl: './filtros-historial.html',
  styleUrl: './filtros-historial.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosHistorial {
  readonly filtrosActuales = input.required<FiltrosTransaccion>();

  readonly aplicar = output<FiltrosTransaccion>();

  readonly limpiar = output<void>();

  readonly cerrar = output<void>();

  readonly estadosElegidos = signal<EstadoTransaccion[]>([]);
  readonly tipoElegido = signal<TipoTransaccion | null>(null);
  readonly desde = signal<string>('');
  readonly hasta = signal<string>('');

  readonly opcionesEstado: ReadonlyArray<{ valor: EstadoTransaccion; texto: string }> = (
    ['completada', 'pendiente', 'fallida'] as const
  ).map((valor) => ({ valor, texto: ETIQUETAS_ESTADO[valor] }));

  readonly opcionesTipo: ReadonlyArray<{ valor: TipoTransaccion | null; texto: string }> = [
    { valor: null, texto: 'Todos' },
    { valor: 'ingreso', texto: 'Ingresos' },
    { valor: 'egreso', texto: 'Gastos' },
  ];

  constructor() {
    effect(() => {
      const filtros = this.filtrosActuales();
      this.estadosElegidos.set([...(filtros.estados ?? [])]);
      this.tipoElegido.set(filtros.tipo ?? null);
      this.desde.set(filtros.desde ?? '');
      this.hasta.set(filtros.hasta ?? '');
    });
  }

  estaElegido(estado: EstadoTransaccion): boolean {
    return this.estadosElegidos().includes(estado);
  }

  alternarEstado(estado: EstadoTransaccion): void {
    this.estadosElegidos.update((lista) =>
      lista.includes(estado) ? lista.filter((e) => e !== estado) : [...lista, estado],
    );
  }

  elegirTipo(tipo: TipoTransaccion | null): void {
    this.tipoElegido.set(tipo);
  }

  cambiarDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
  }

  cambiarHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
  }

  confirmar(): void {
    this.aplicar.emit({
      busqueda: this.filtrosActuales().busqueda ?? '',
      estados: this.estadosElegidos(),
      tipo: this.tipoElegido(),
      desde: this.desde() || null,
      hasta: this.hasta() || null,
    });
  }

  reiniciar(): void {
    this.estadosElegidos.set([]);
    this.tipoElegido.set(null);
    this.desde.set('');
    this.hasta.set('');
    this.limpiar.emit();
  }
}

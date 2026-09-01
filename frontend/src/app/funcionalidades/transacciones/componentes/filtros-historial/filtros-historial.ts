import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import {
  ETIQUETAS_ESTADO,
  EstadoTransaccion,
  FiltrosTransaccion,
  TipoTransaccion,
} from '../../../../nucleo/modelos';
import { Icono } from '../../../../compartido';

/**
 * PANEL DE FILTROS DEL HISTORIAL
 * -----------------------------------------------------------------------------
 * Componente de PRESENTACIÓN: no habla con Supabase ni con ningún servicio.
 * Recibe los filtros actuales por `input()` y avisa de los nuevos por
 * `output()`. El componente padre decide qué hacer con ellos.
 *
 * Esta separación (componentes «tontos» de presentación + componentes
 * «inteligentes» que orquestan) facilita reutilizar y probar el panel.
 */
@Component({
  selector: 'app-filtros-historial',
  imports: [Icono],
  templateUrl: './filtros-historial.html',
  styleUrl: './filtros-historial.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosHistorial {
  /** Filtros que están aplicados ahora mismo. */
  readonly filtrosActuales = input.required<FiltrosTransaccion>();

  /** Se emite al pulsar «Aplicar». */
  readonly aplicar = output<FiltrosTransaccion>();

  /** Se emite al pulsar «Limpiar». */
  readonly limpiar = output<void>();

  /** Se emite al cerrar el panel. */
  readonly cerrar = output<void>();

  // --- Estado local del formulario (borrador hasta pulsar «Aplicar») ---------
  readonly estadosElegidos = signal<EstadoTransaccion[]>([]);
  readonly tipoElegido = signal<TipoTransaccion | null>(null);
  readonly desde = signal<string>('');
  readonly hasta = signal<string>('');

  /** Opciones del bloque «Estado», con su etiqueta en español. */
  readonly opcionesEstado: ReadonlyArray<{ valor: EstadoTransaccion; texto: string }> = (
    ['completada', 'pendiente', 'fallida'] as const
  ).map((valor) => ({ valor, texto: ETIQUETAS_ESTADO[valor] }));

  /** Opciones del bloque «Tipo». */
  readonly opcionesTipo: ReadonlyArray<{ valor: TipoTransaccion | null; texto: string }> = [
    { valor: null, texto: 'Todos' },
    { valor: 'ingreso', texto: 'Ingresos' },
    { valor: 'egreso', texto: 'Gastos' },
  ];

  constructor() {
    /**
     * Cuando el padre nos pasa los filtros vigentes, rellenamos el formulario
     * con ellos: al reabrir el panel se ve lo que ya estaba aplicado.
     */
    effect(() => {
      const filtros = this.filtrosActuales();
      this.estadosElegidos.set([...(filtros.estados ?? [])]);
      this.tipoElegido.set(filtros.tipo ?? null);
      this.desde.set(filtros.desde ?? '');
      this.hasta.set(filtros.hasta ?? '');
    });
  }

  /** ¿Está marcado este estado? */
  estaElegido(estado: EstadoTransaccion): boolean {
    return this.estadosElegidos().includes(estado);
  }

  /** Marca o desmarca un estado (los estados se acumulan). */
  alternarEstado(estado: EstadoTransaccion): void {
    this.estadosElegidos.update((lista) =>
      lista.includes(estado) ? lista.filter((e) => e !== estado) : [...lista, estado],
    );
  }

  /** Elige el tipo de movimiento (excluyente). */
  elegirTipo(tipo: TipoTransaccion | null): void {
    this.tipoElegido.set(tipo);
  }

  /** Guarda la fecha inicial del rango. */
  cambiarDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
  }

  /** Guarda la fecha final del rango. */
  cambiarHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
  }

  /** Envía el borrador al padre. Se conserva la búsqueda de texto vigente. */
  confirmar(): void {
    this.aplicar.emit({
      busqueda: this.filtrosActuales().busqueda ?? '',
      estados: this.estadosElegidos(),
      tipo: this.tipoElegido(),
      desde: this.desde() || null,
      hasta: this.hasta() || null,
    });
  }

  /** Vacía el formulario y avisa al padre. */
  reiniciar(): void {
    this.estadosElegidos.set([]);
    this.tipoElegido.set(null);
    this.desde.set('');
    this.hasta.set('');
    this.limpiar.emit();
  }
}

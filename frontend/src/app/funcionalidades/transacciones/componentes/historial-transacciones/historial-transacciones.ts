import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AvisosServicio,
  TransaccionesServicio,
} from '../../../../nucleo/servicios';
import {
  CampoOrden,
  EstadoTransaccion,
  FiltrosTransaccion,
  TransaccionDetalle,
} from '../../../../nucleo/modelos';
import {
  Avatar,
  Esqueleto,
  EstadoVacio,
  EtiquetaEstado,
  FechaTransaccionPipe,
  Icono,
  MontoPipe,
  Tarjeta,
} from '../../../../compartido';
import { FiltrosHistorial } from '../filtros-historial/filtros-historial';
import { FormularioTransaccion } from '../formulario-transaccion/formulario-transaccion';

/**
 * HISTORIAL DE TRANSACCIONES
 * -----------------------------------------------------------------------------
 * La tabla principal del panel. Es un componente «inteligente»: coordina el
 * servicio de transacciones con los componentes de presentación (filtros,
 * formulario, etiquetas...).
 *
 * Todo el trabajo pesado (filtrar, ordenar, paginar) lo hace la base de datos;
 * aquí solo se recogen las interacciones del usuario y se muestran resultados.
 */
@Component({
  selector: 'app-historial-transacciones',
  imports: [
    Tarjeta,
    Avatar,
    Icono,
    EtiquetaEstado,
    Esqueleto,
    EstadoVacio,
    MontoPipe,
    FechaTransaccionPipe,
    FiltrosHistorial,
    FormularioTransaccion,
  ],
  templateUrl: './historial-transacciones.html',
  styleUrl: './historial-transacciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialTransacciones implements OnInit {
  private readonly servicio = inject(TransaccionesServicio);
  private readonly avisos = inject(AvisosServicio);

  // --- Datos del servicio ----------------------------------------------------
  readonly transacciones = this.servicio.transacciones;
  readonly estado = this.servicio.estado;
  readonly error = this.servicio.error;
  readonly filtros = this.servicio.filtros;
  readonly orden = this.servicio.orden;
  readonly pagina = this.servicio.pagina;
  readonly totalPaginas = this.servicio.totalPaginas;
  readonly total = this.servicio.total;
  readonly hayFiltrosActivos = this.servicio.hayFiltrosActivos;

  // --- Estado propio de la interfaz ------------------------------------------
  /** Muestra u oculta el campo de búsqueda. */
  readonly buscadorAbierto = signal(false);

  /** Muestra u oculta el panel de filtros. */
  readonly filtrosAbiertos = signal(false);

  /** Muestra u oculta la ventana de nueva transacción. */
  readonly formularioAbierto = signal(false);

  /** Id de la fila cuyo menú de tres puntos está desplegado. */
  readonly menuAbiertoId = signal<string | null>(null);

  /** Ids de las filas marcadas con la casilla. */
  readonly seleccionadas = signal<Set<string>>(new Set());

  /** Temporizador de la búsqueda, para no consultar en cada tecla. */
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  // --- Valores derivados -----------------------------------------------------

  /** true si TODAS las filas visibles están marcadas. */
  readonly todasSeleccionadas = computed(() => {
    const filas = this.transacciones();
    const marcadas = this.seleccionadas();
    return filas.length > 0 && filas.every((fila) => marcadas.has(fila.id));
  });

  /** Número de filas marcadas: decide si se ve la barra de acciones. */
  readonly numeroSeleccionadas = computed(() => this.seleccionadas().size);

  /** Texto del pie de la tabla: «Mostrando 1-8 de 20». */
  readonly textoPaginacion = computed(() => {
    const total = this.total();
    if (total === 0) {
      return 'Sin resultados';
    }

    const desde = (this.pagina() - 1) * this.servicio.tamanoPagina + 1;
    const hasta = Math.min(desde + this.transacciones().length - 1, total);
    return `Mostrando ${desde}–${hasta} de ${total}`;
  });

  ngOnInit(): void {
    void this.servicio.cargar();
  }

  // ==========================================================================
  // BÚSQUEDA Y FILTROS
  // ==========================================================================

  /** Abre o cierra el campo de búsqueda; al cerrarlo, limpia el texto. */
  alternarBuscador(): void {
    const abriendo = !this.buscadorAbierto();
    this.buscadorAbierto.set(abriendo);

    if (!abriendo && this.filtros().busqueda) {
      void this.servicio.buscar('');
    }
  }

  /**
   * Búsqueda con «rebote» (debounce): espera 300 ms desde la última tecla
   * antes de consultar. Sin esto, escribir «amazon» lanzaría seis consultas.
   */
  alEscribirBusqueda(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;

    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }

    this.temporizadorBusqueda = setTimeout(() => {
      void this.servicio.buscar(texto);
    }, 300);
  }

  /** Abre o cierra el panel de filtros. */
  alternarFiltros(): void {
    this.filtrosAbiertos.update((abierto) => !abierto);
  }

  /** Aplica los filtros que envía el panel y lo cierra. */
  async aplicarFiltros(filtros: FiltrosTransaccion): Promise<void> {
    await this.servicio.aplicarFiltros(filtros);
    this.filtrosAbiertos.set(false);
    this.limpiarSeleccion();
  }

  /** Vacía los filtros. */
  async limpiarFiltros(): Promise<void> {
    await this.servicio.limpiarFiltros();
    this.filtrosAbiertos.set(false);
    this.limpiarSeleccion();
  }

  // ==========================================================================
  // ORDEN Y PAGINACIÓN
  // ==========================================================================

  /** Ordena por una columna al pulsar su cabecera. */
  async ordenar(campo: CampoOrden): Promise<void> {
    await this.servicio.ordenarPor(campo);
    this.limpiarSeleccion();
  }

  /** Indica si la tabla está ordenada por esta columna (para la flecha). */
  esColumnaOrdenada(campo: CampoOrden): boolean {
    return this.orden().campo === campo;
  }

  /** Cambia de página. */
  async irAPagina(pagina: number): Promise<void> {
    await this.servicio.irAPagina(pagina);
    this.limpiarSeleccion();
  }

  // ==========================================================================
  // SELECCIÓN DE FILAS
  // ==========================================================================

  /** ¿Está marcada esta fila? */
  estaSeleccionada(id: string): boolean {
    return this.seleccionadas().has(id);
  }

  /**
   * Marca o desmarca una fila.
   * Se crea un Set NUEVO en lugar de mutar el existente: las señales solo
   * notifican el cambio si la referencia del valor cambia.
   */
  alternarSeleccion(id: string): void {
    this.seleccionadas.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  /** Casilla de la cabecera: marca o desmarca toda la página. */
  alternarTodas(): void {
    if (this.todasSeleccionadas()) {
      this.limpiarSeleccion();
    } else {
      this.seleccionadas.set(new Set(this.transacciones().map((fila) => fila.id)));
    }
  }

  /** Quita todas las marcas. */
  limpiarSeleccion(): void {
    this.seleccionadas.set(new Set());
  }

  // ==========================================================================
  // ACCIONES SOBRE FILAS
  // ==========================================================================

  /** Abre o cierra el menú de tres puntos de una fila. */
  alternarMenu(id: string): void {
    this.menuAbiertoId.update((actual) => (actual === id ? null : id));
  }

  /** Cierra el menú abierto. */
  cerrarMenu(): void {
    this.menuAbiertoId.set(null);
  }

  /** Cambia el estado de una transacción desde el menú. */
  async cambiarEstado(id: string, estado: EstadoTransaccion): Promise<void> {
    this.cerrarMenu();

    try {
      await this.servicio.cambiarEstado(id, estado);
      this.avisos.exito('Estado actualizado.');
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    }
  }

  /** Elimina una transacción. */
  async eliminar(id: string): Promise<void> {
    this.cerrarMenu();

    try {
      await this.servicio.eliminar(id);
      this.avisos.exito('Transacción eliminada.');
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  }

  /** Elimina todas las filas marcadas. */
  async eliminarSeleccionadas(): Promise<void> {
    const ids = [...this.seleccionadas()];
    if (!ids.length) {
      return;
    }

    try {
      // Se borran de una en una para que el servicio refresque el estado bien.
      for (const id of ids) {
        await this.servicio.eliminar(id);
      }
      this.avisos.exito(`${ids.length} transacción(es) eliminada(s).`);
      this.limpiarSeleccion();
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudieron eliminar.');
    }
  }

  // ==========================================================================
  // FORMULARIO DE ALTA
  // ==========================================================================

  abrirFormulario(): void {
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  // ==========================================================================
  // AYUDAS PARA LA PLANTILLA
  // ==========================================================================

  /** Los gastos se muestran con signo menos delante. */
  esNegativo(fila: TransaccionDetalle): boolean {
    return fila.tipo === 'egreso';
  }

  /** Reintenta la carga tras un error. */
  reintentar(): void {
    void this.servicio.cargar();
  }
}

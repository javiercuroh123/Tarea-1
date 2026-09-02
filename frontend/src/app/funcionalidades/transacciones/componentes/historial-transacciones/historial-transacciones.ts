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

  readonly transacciones = this.servicio.transacciones;
  readonly estado = this.servicio.estado;
  readonly error = this.servicio.error;
  readonly filtros = this.servicio.filtros;
  readonly orden = this.servicio.orden;
  readonly pagina = this.servicio.pagina;
  readonly totalPaginas = this.servicio.totalPaginas;
  readonly total = this.servicio.total;
  readonly hayFiltrosActivos = this.servicio.hayFiltrosActivos;

  readonly buscadorAbierto = signal(false);

  readonly filtrosAbiertos = signal(false);

  readonly formularioAbierto = signal(false);

  readonly menuAbiertoId = signal<string | null>(null);

  readonly seleccionadas = signal<Set<string>>(new Set());

  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  readonly todasSeleccionadas = computed(() => {
    const filas = this.transacciones();
    const marcadas = this.seleccionadas();
    return filas.length > 0 && filas.every((fila) => marcadas.has(fila.id));
  });

  readonly numeroSeleccionadas = computed(() => this.seleccionadas().size);

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

  alternarBuscador(): void {
    const abriendo = !this.buscadorAbierto();
    this.buscadorAbierto.set(abriendo);

    if (!abriendo && this.filtros().busqueda) {
      void this.servicio.buscar('');
    }
  }

  alEscribirBusqueda(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;

    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }

    this.temporizadorBusqueda = setTimeout(() => {
      void this.servicio.buscar(texto);
    }, 300);
  }

  alternarFiltros(): void {
    this.filtrosAbiertos.update((abierto) => !abierto);
  }

  async aplicarFiltros(filtros: FiltrosTransaccion): Promise<void> {
    await this.servicio.aplicarFiltros(filtros);
    this.filtrosAbiertos.set(false);
    this.limpiarSeleccion();
  }

  async limpiarFiltros(): Promise<void> {
    await this.servicio.limpiarFiltros();
    this.filtrosAbiertos.set(false);
    this.limpiarSeleccion();
  }

  async ordenar(campo: CampoOrden): Promise<void> {
    await this.servicio.ordenarPor(campo);
    this.limpiarSeleccion();
  }

  esColumnaOrdenada(campo: CampoOrden): boolean {
    return this.orden().campo === campo;
  }

  async irAPagina(pagina: number): Promise<void> {
    await this.servicio.irAPagina(pagina);
    this.limpiarSeleccion();
  }

  estaSeleccionada(id: string): boolean {
    return this.seleccionadas().has(id);
  }

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

  alternarTodas(): void {
    if (this.todasSeleccionadas()) {
      this.limpiarSeleccion();
    } else {
      this.seleccionadas.set(new Set(this.transacciones().map((fila) => fila.id)));
    }
  }

  limpiarSeleccion(): void {
    this.seleccionadas.set(new Set());
  }

  alternarMenu(id: string): void {
    this.menuAbiertoId.update((actual) => (actual === id ? null : id));
  }

  cerrarMenu(): void {
    this.menuAbiertoId.set(null);
  }

  async cambiarEstado(id: string, estado: EstadoTransaccion): Promise<void> {
    this.cerrarMenu();

    try {
      await this.servicio.cambiarEstado(id, estado);
      this.avisos.exito('Estado actualizado.');
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    }
  }

  async eliminar(id: string): Promise<void> {
    this.cerrarMenu();

    try {
      await this.servicio.eliminar(id);
      this.avisos.exito('Transacción eliminada.');
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  }

  async eliminarSeleccionadas(): Promise<void> {
    const ids = [...this.seleccionadas()];
    if (!ids.length) {
      return;
    }

    try {
      for (const id of ids) {
        await this.servicio.eliminar(id);
      }
      this.avisos.exito(`${ids.length} transacción(es) eliminada(s).`);
      this.limpiarSeleccion();
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudieron eliminar.');
    }
  }

  abrirFormulario(): void {
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  esNegativo(fila: TransaccionDetalle): boolean {
    return fila.tipo === 'egreso';
  }

  reintentar(): void {
    void this.servicio.cargar();
  }
}

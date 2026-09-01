import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  EstadoCarga,
  EstadoTransaccion,
  FiltrosTransaccion,
  NuevaTransaccion,
  OrdenTabla,
  PuntoVolumen,
  PuntoVolumenCrudo,
  TransaccionDetalle,
} from '../modelos';
import { aNumero } from '../utilidades/formato.util';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { UsuariosServicio } from './usuarios.servicio';

/**
 * SERVICIO DE TRANSACCIONES
 * -----------------------------------------------------------------------------
 * Es el servicio más importante de la aplicación. Se encarga de:
 *   1. Listar el historial con FILTROS, ORDEN y PAGINACIÓN (todo en servidor).
 *   2. Traer los datos del gráfico de volumen (RPC `fn_volumen_pagos`).
 *   3. Crear, borrar y cambiar el estado de una transacción.
 *
 * DECISIÓN IMPORTANTE: filtrar y paginar en el SERVIDOR, no en el navegador.
 * Con 20 filas daría igual, pero con 50.000 el navegador se bloquearía. La base
 * de datos ya tiene los índices adecuados para hacerlo rápido.
 */
@Injectable({ providedIn: 'root' })
export class TransaccionesServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly usuarios = inject(UsuariosServicio);

  /** Nombre de la vista que ya trae los datos del comercio unidos. */
  private readonly VISTA = 'vista_transacciones_detalle';

  // --- Estado del listado ----------------------------------------------------
  private readonly _transacciones = signal<TransaccionDetalle[]>([]);
  private readonly _total = signal(0);
  private readonly _pagina = signal(1);
  private readonly _estado = signal<EstadoCarga>('inactivo');
  private readonly _error = signal<string | null>(null);

  private readonly _filtros = signal<FiltrosTransaccion>({
    busqueda: '',
    estados: [],
    tipo: null,
    desde: null,
    hasta: null,
  });

  private readonly _orden = signal<OrdenTabla>({ campo: 'fecha', direccion: 'desc' });

  // --- Estado del gráfico ----------------------------------------------------
  private readonly _volumen = signal<PuntoVolumen[]>([]);
  private readonly _estadoVolumen = signal<EstadoCarga>('inactivo');

  // --- Señales públicas (solo lectura) ---------------------------------------
  readonly transacciones = this._transacciones.asReadonly();
  readonly total = this._total.asReadonly();
  readonly pagina = this._pagina.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filtros = this._filtros.asReadonly();
  readonly orden = this._orden.asReadonly();
  readonly volumen = this._volumen.asReadonly();
  readonly estadoVolumen = this._estadoVolumen.asReadonly();

  /** Filas por página (configurable desde environment.ts). */
  readonly tamanoPagina = environment.filasPorPagina;

  /** Número total de páginas; mínimo 1 para que el paginador siempre exista. */
  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this._total() / this.tamanoPagina)),
  );

  /** true si hay algún filtro activo (para mostrar el botón «Limpiar»). */
  readonly hayFiltrosActivos = computed(() => {
    const f = this._filtros();
    return Boolean(
      f.busqueda?.trim() ||
        f.estados?.length ||
        f.tipo ||
        f.desde ||
        f.hasta,
    );
  });

  /** Importe más alto del gráfico: sirve para escalar la altura de las barras. */
  readonly volumenMaximo = computed(() => {
    const totales = this._volumen().map((punto) => punto.total);
    return totales.length ? Math.max(...totales) : 0;
  });

  // ==========================================================================
  // LISTADO
  // ==========================================================================

  /**
   * Consulta el historial aplicando filtros, orden y paginación.
   *
   * Construye la consulta paso a paso: cada `if` añade una condición solo si
   * el filtro correspondiente tiene valor.
   */
  async cargar(): Promise<void> {
    this._estado.set('cargando');
    this._error.set(null);

    const filtros = this._filtros();
    const orden = this._orden();
    const pagina = this._pagina();

    // Rango de filas de la página actual: página 1 -> filas 0..7
    const primeraFila = (pagina - 1) * this.tamanoPagina;
    const ultimaFila = primeraFila + this.tamanoPagina - 1;

    try {
      // `count: 'exact'` pide además el total de filas que cumplen el filtro,
      // necesario para calcular el número de páginas.
      let consulta = this.supabase
        .tabla(this.VISTA)
        .select('*', { count: 'exact' })
        .eq('usuario_id', this.usuarios.usuarioActivoId);

      // --- Filtro: texto libre ---------------------------------------------
      // `or` busca en el nombre del comercio O en la descripción.
      // `ilike` = LIKE sin distinguir mayúsculas.
      const busqueda = filtros.busqueda?.trim();
      if (busqueda) {
        const patron = `%${busqueda}%`;
        consulta = consulta.or(
          `comercio_nombre.ilike.${patron},descripcion.ilike.${patron}`,
        );
      }

      // --- Filtro: estados (varios a la vez) --------------------------------
      if (filtros.estados?.length) {
        consulta = consulta.in('estado', filtros.estados);
      }

      // --- Filtro: tipo de movimiento ---------------------------------------
      if (filtros.tipo) {
        consulta = consulta.eq('tipo', filtros.tipo);
      }

      // --- Filtro: rango de fechas ------------------------------------------
      if (filtros.desde) {
        consulta = consulta.gte('fecha', `${filtros.desde}T00:00:00`);
      }
      if (filtros.hasta) {
        // Hasta el final del día indicado, para que ese día se incluya.
        consulta = consulta.lte('fecha', `${filtros.hasta}T23:59:59`);
      }

      // --- Orden y página ----------------------------------------------------
      consulta = consulta
        .order(orden.campo, { ascending: orden.direccion === 'asc' })
        .range(primeraFila, ultimaFila);

      const { data, error, count } = await consulta;

      if (error) {
        throw error;
      }

      // Los `numeric` llegan como texto: los normalizamos aquí, una sola vez,
      // para que los componentes reciban números de verdad.
      const filas = (data ?? []).map((fila: Record<string, unknown>) => ({
        ...(fila as unknown as TransaccionDetalle),
        monto: aNumero(fila['monto'] as string),
        monto_con_signo: aNumero(fila['monto_con_signo'] as string),
      }));

      this._transacciones.set(filas);
      this._total.set(count ?? 0);
      this._estado.set('listo');
    } catch (error) {
      registrarError('TransaccionesServicio.cargar', error);
      this._error.set(mensajeDeError(error, 'No se pudo cargar el historial.'));
      this._estado.set('error');
      this._transacciones.set([]);
      this._total.set(0);
    }
  }

  // ==========================================================================
  // FILTROS, ORDEN Y PAGINACIÓN
  // Todos vuelven a la página 1, porque el contenido cambia por completo.
  // ==========================================================================

  /** Sustituye los filtros y recarga. */
  async aplicarFiltros(filtros: FiltrosTransaccion): Promise<void> {
    this._filtros.set(filtros);
    this._pagina.set(1);
    await this.cargar();
  }

  /** Solo cambia el texto de búsqueda (lo usa el buscador de la cabecera). */
  async buscar(texto: string): Promise<void> {
    this._filtros.update((f) => ({ ...f, busqueda: texto }));
    this._pagina.set(1);
    await this.cargar();
  }

  /** Vacía todos los filtros. */
  async limpiarFiltros(): Promise<void> {
    await this.aplicarFiltros({
      busqueda: '',
      estados: [],
      tipo: null,
      desde: null,
      hasta: null,
    });
  }

  /**
   * Ordena por una columna. Si ya se estaba ordenando por ella, invierte la
   * dirección (comportamiento habitual al pulsar la cabecera de una tabla).
   */
  async ordenarPor(campo: OrdenTabla['campo']): Promise<void> {
    this._orden.update((actual) =>
      actual.campo === campo
        ? { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
        : { campo, direccion: 'desc' },
    );
    this._pagina.set(1);
    await this.cargar();
  }

  /** Va a una página concreta (ignora valores fuera de rango). */
  async irAPagina(pagina: number): Promise<void> {
    if (pagina < 1 || pagina > this.totalPaginas() || pagina === this._pagina()) {
      return;
    }
    this._pagina.set(pagina);
    await this.cargar();
  }

  // ==========================================================================
  // GRÁFICO DE VOLUMEN
  // ==========================================================================

  /**
   * Pide a la base de datos la suma diaria de los últimos N días.
   * El cálculo se hace en SQL: es una agregación, y la BD es mucho más rápida
   * que el navegador haciéndolas.
   */
  async cargarVolumen(dias = environment.diasGraficoVolumen): Promise<void> {
    this._estadoVolumen.set('cargando');

    try {
      const { data, error } = await this.supabase.funcion<PuntoVolumenCrudo[]>(
        'fn_volumen_pagos',
        { p_usuario: this.usuarios.usuarioActivoId, p_dias: dias },
      );

      if (error) {
        throw error;
      }

      const puntos: PuntoVolumen[] = (data ?? []).map((crudo) => {
        // `dia` llega como 'yyyy-mm-dd'. Le añadimos la hora para que el
        // navegador no lo interprete en UTC y muestre el día anterior.
        const fecha = new Date(`${crudo.dia}T12:00:00`);

        return {
          fecha,
          total: aNumero(crudo.total),
          etiquetaCorta: new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(fecha),
          etiquetaLarga: new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
          }).format(fecha),
        };
      });

      this._volumen.set(puntos);
      this._estadoVolumen.set('listo');
    } catch (error) {
      registrarError('TransaccionesServicio.cargarVolumen', error);
      this._volumen.set([]);
      this._estadoVolumen.set('error');
    }
  }

  // ==========================================================================
  // ESCRITURA
  // ==========================================================================

  /** Inserta una transacción nueva y recarga listado y gráfico. */
  async crear(transaccion: NuevaTransaccion): Promise<void> {
    const { error } = await this.supabase.tabla('transacciones').insert(transaccion);

    if (error) {
      throw new Error(mensajeDeError(error, 'No se pudo guardar la transacción.'));
    }

    await this.refrescarTodo();
  }

  /** Cambia el estado de una transacción (por ejemplo, pendiente -> completada). */
  async cambiarEstado(id: string, estado: EstadoTransaccion): Promise<void> {
    const { error } = await this.supabase
      .tabla('transacciones')
      .update({ estado })
      .eq('id', id);

    if (error) {
      throw new Error(mensajeDeError(error, 'No se pudo actualizar el estado.'));
    }

    await this.refrescarTodo();
  }

  /** Elimina una transacción. */
  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.tabla('transacciones').delete().eq('id', id);

    if (error) {
      throw new Error(mensajeDeError(error, 'No se pudo eliminar la transacción.'));
    }

    // Si al borrar la página se queda vacía, retrocedemos una página.
    if (this._transacciones().length === 1 && this._pagina() > 1) {
      this._pagina.update((p) => p - 1);
    }

    await this.refrescarTodo();
  }

  /**
   * Recarga listado, gráfico y métricas después de una escritura.
   * En paralelo, porque son consultas independientes.
   */
  private async refrescarTodo(): Promise<void> {
    await Promise.all([
      this.cargar(),
      this.cargarVolumen(),
      this.usuarios.refrescarResumen(),
    ]);
  }
}

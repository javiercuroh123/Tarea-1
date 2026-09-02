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

@Injectable({ providedIn: 'root' })
export class TransaccionesServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly usuarios = inject(UsuariosServicio);

  private readonly VISTA = 'vista_transacciones_detalle';

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

  private readonly _volumen = signal<PuntoVolumen[]>([]);
  private readonly _estadoVolumen = signal<EstadoCarga>('inactivo');

  readonly transacciones = this._transacciones.asReadonly();
  readonly total = this._total.asReadonly();
  readonly pagina = this._pagina.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filtros = this._filtros.asReadonly();
  readonly orden = this._orden.asReadonly();
  readonly volumen = this._volumen.asReadonly();
  readonly estadoVolumen = this._estadoVolumen.asReadonly();

  readonly tamanoPagina = environment.filasPorPagina;

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this._total() / this.tamanoPagina)),
  );

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

  readonly volumenMaximo = computed(() => {
    const totales = this._volumen().map((punto) => punto.total);
    return totales.length ? Math.max(...totales) : 0;
  });

  async cargar(): Promise<void> {
    this._estado.set('cargando');
    this._error.set(null);

    const filtros = this._filtros();
    const orden = this._orden();
    const pagina = this._pagina();

    const primeraFila = (pagina - 1) * this.tamanoPagina;
    const ultimaFila = primeraFila + this.tamanoPagina - 1;

    try {
      let consulta = this.supabase
        .tabla(this.VISTA)
        .select('*', { count: 'exact' })
        .eq('usuario_id', this.usuarios.usuarioActivoId);

      const busqueda = filtros.busqueda?.trim();
      if (busqueda) {
        const patron = `%${busqueda}%`;
        consulta = consulta.or(
          `comercio_nombre.ilike.${patron},descripcion.ilike.${patron}`,
        );
      }

      if (filtros.estados?.length) {
        consulta = consulta.in('estado', filtros.estados);
      }

      if (filtros.tipo) {
        consulta = consulta.eq('tipo', filtros.tipo);
      }

      if (filtros.desde) {
        consulta = consulta.gte('fecha', `${filtros.desde}T00:00:00`);
      }
      if (filtros.hasta) {
        consulta = consulta.lte('fecha', `${filtros.hasta}T23:59:59`);
      }

      consulta = consulta
        .order(orden.campo, { ascending: orden.direccion === 'asc' })
        .range(primeraFila, ultimaFila);

      const { data, error, count } = await consulta;

      if (error) {
        throw error;
      }

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

  async aplicarFiltros(filtros: FiltrosTransaccion): Promise<void> {
    this._filtros.set(filtros);
    this._pagina.set(1);
    await this.cargar();
  }

  async buscar(texto: string): Promise<void> {
    this._filtros.update((f) => ({ ...f, busqueda: texto }));
    this._pagina.set(1);
    await this.cargar();
  }

  async limpiarFiltros(): Promise<void> {
    await this.aplicarFiltros({
      busqueda: '',
      estados: [],
      tipo: null,
      desde: null,
      hasta: null,
    });
  }

  async ordenarPor(campo: OrdenTabla['campo']): Promise<void> {
    this._orden.update((actual) =>
      actual.campo === campo
        ? { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
        : { campo, direccion: 'desc' },
    );
    this._pagina.set(1);
    await this.cargar();
  }

  async irAPagina(pagina: number): Promise<void> {
    if (pagina < 1 || pagina > this.totalPaginas() || pagina === this._pagina()) {
      return;
    }
    this._pagina.set(pagina);
    await this.cargar();
  }

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

  async crear(transaccion: NuevaTransaccion): Promise<void> {
    const { error } = await this.supabase.tabla('transacciones').insert(transaccion);

    if (error) {
      throw new Error(mensajeDeError(error, 'No se pudo guardar la transacción.'));
    }

    await this.refrescarTodo();
  }

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

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.tabla('transacciones').delete().eq('id', id);

    if (error) {
      throw new Error(mensajeDeError(error, 'No se pudo eliminar la transacción.'));
    }

    if (this._transacciones().length === 1 && this._pagina() > 1) {
      this._pagina.update((p) => p - 1);
    }

    await this.refrescarTodo();
  }

  private async refrescarTodo(): Promise<void> {
    await Promise.all([
      this.cargar(),
      this.cargarVolumen(),
      this.usuarios.refrescarResumen(),
    ]);
  }
}

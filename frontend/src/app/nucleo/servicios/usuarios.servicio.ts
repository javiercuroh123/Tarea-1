import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EstadoCarga, ResumenUsuario, ResumenUsuarioCrudo, Usuario } from '../modelos';
import { aNumero } from '../utilidades/formato.util';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';

/**
 * SERVICIO DE USUARIOS
 * -----------------------------------------------------------------------------
 * Responsable de:
 *   - Cargar el usuario que se muestra en el encabezado.
 *   - Cargar el resumen de métricas (RPC `fn_resumen_usuario`).
 *
 * Patrón usado en todos los servicios de dominio del proyecto:
 *   señal privada `_x` (escritura)  ->  señal pública `x` (solo lectura)
 * De este modo el estado solo se modifica desde el servicio y los componentes
 * nunca pueden corromperlo.
 */
@Injectable({ providedIn: 'root' })
export class UsuariosServicio {
  private readonly supabase = inject(SupabaseServicio);

  // --- Estado ----------------------------------------------------------------
  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _resumen = signal<ResumenUsuario | null>(null);
  private readonly _estado = signal<EstadoCarga>('inactivo');
  private readonly _error = signal<string | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly resumen = this._resumen.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly error = this._error.asReadonly();

  /** `computed` deriva un valor de otras señales y se recalcula solo. */
  readonly cargando = computed(() => this._estado() === 'cargando');

  /**
   * Id del usuario activo.
   * Hoy sale de la configuración; el día que se añada Supabase Auth vendrá de
   * la sesión (`auth.uid()`) sin que el resto de la aplicación se entere.
   */
  get usuarioActivoId(): string {
    return environment.usuarioDemoId;
  }

  /**
   * Carga el usuario y su resumen. Las dos peticiones van EN PARALELO con
   * `Promise.all` porque no dependen entre sí: así tarda lo que la más lenta.
   */
  async cargar(): Promise<void> {
    this._estado.set('cargando');
    this._error.set(null);

    try {
      await Promise.all([this.cargarUsuario(), this.cargarResumen()]);
      this._estado.set('listo');
    } catch (error) {
      registrarError('UsuariosServicio.cargar', error);
      this._error.set(mensajeDeError(error, 'No se pudo cargar el usuario.'));
      this._estado.set('error');
    }
  }

  /** Vuelve a pedir solo el resumen (tras crear o borrar una transacción). */
  async refrescarResumen(): Promise<void> {
    try {
      await this.cargarResumen();
    } catch (error) {
      registrarError('UsuariosServicio.refrescarResumen', error);
    }
  }

  // --- Métodos privados ------------------------------------------------------

  /** Trae la fila del usuario activo. */
  private async cargarUsuario(): Promise<void> {
    const { data, error } = await this.supabase
      .tabla('usuarios')
      .select('*')
      .eq('id', this.usuarioActivoId)
      .single();          // esperamos exactamente una fila

    if (error) {
      throw error;
    }

    this._usuario.set(data as Usuario);
  }

  /**
   * Llama a la RPC del resumen y convierte los `numeric` (que llegan como
   * cadenas de texto) a números de JavaScript.
   */
  private async cargarResumen(): Promise<void> {
    const { data, error } = await this.supabase.funcion<ResumenUsuarioCrudo[]>(
      'fn_resumen_usuario',
      { p_usuario: this.usuarioActivoId },
    );

    if (error) {
      throw error;
    }

    // La función devuelve una tabla; nos interesa su única fila.
    const fila = data?.[0];
    if (!fila) {
      this._resumen.set(null);
      return;
    }

    this._resumen.set({
      totalIngresos: aNumero(fila.total_ingresos),
      totalEgresos: aNumero(fila.total_egresos),
      saldo: aNumero(fila.saldo),
      numCompletadas: Number(fila.num_completadas),
      numPendientes: Number(fila.num_pendientes),
      numFallidas: Number(fila.num_fallidas),
    });
  }
}

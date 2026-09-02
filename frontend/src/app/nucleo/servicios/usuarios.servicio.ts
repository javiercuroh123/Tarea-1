import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EstadoCarga, ResumenUsuario, ResumenUsuarioCrudo, Usuario } from '../modelos';
import { aNumero } from '../utilidades/formato.util';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { AutenticacionServicio } from './autenticacion.servicio';

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
  private readonly auth = inject(AutenticacionServicio);

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
   * Proviene de la sesión de Supabase Auth o del modo demo.
   */
  get usuarioActivoId(): string {
    return this.auth.usuarioActivoId() ?? environment.usuarioDemoId;
  }

  constructor() {
    // Cuando cambie el usuario autenticado, recargamos sus datos
    effect(() => {
      const id = this.auth.usuarioActivoId();
      if (id) {
        void this.cargar();
      } else {
        this._usuario.set(null);
        this._resumen.set(null);
      }
    });
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
    const id = this.usuarioActivoId;
    if (!id) {
      this._usuario.set(null);
      return;
    }

    const { data, error } = await this.supabase
      .tabla('usuarios')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const authUser = this.auth.usuarioAuth();
      const nombre =
        (authUser?.user_metadata?.['nombre_completo'] as string) ||
        authUser?.email?.split('@')[0] ||
        'Usuario';

      const nuevoPerfil: Usuario = {
        id,
        nombre_completo: nombre,
        correo: authUser?.email || 'usuario@payline.dev',
        rol: 'ADMIN',
        avatar_url: null,
        color_avatar: '#5B4DF0',
        moneda_base: 'EUR',
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      };

      try {
        const { data: creado } = await this.supabase
          .tabla('usuarios')
          .insert(nuevoPerfil)
          .select('*')
          .maybeSingle();

        this._usuario.set(creado ? (creado as Usuario) : nuevoPerfil);
      } catch (e) {
        registrarError('UsuariosServicio.crearPerfil', e);
        this._usuario.set(nuevoPerfil);
      }
      return;
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

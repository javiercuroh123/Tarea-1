import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EstadoCarga, ResumenUsuario, ResumenUsuarioCrudo, Usuario } from '../modelos';
import { aNumero } from '../utilidades/formato.util';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { AutenticacionServicio } from './autenticacion.servicio';

@Injectable({ providedIn: 'root' })
export class UsuariosServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly auth = inject(AutenticacionServicio);

  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _resumen = signal<ResumenUsuario | null>(null);
  private readonly _estado = signal<EstadoCarga>('inactivo');
  private readonly _error = signal<string | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly resumen = this._resumen.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly error = this._error.asReadonly();

  readonly cargando = computed(() => this._estado() === 'cargando');

  get usuarioActivoId(): string {
    return this.auth.usuarioActivoId() ?? environment.usuarioDemoId;
  }

  constructor() {
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

  async refrescarResumen(): Promise<void> {
    try {
      await this.cargarResumen();
    } catch (error) {
      registrarError('UsuariosServicio.refrescarResumen', error);
    }
  }

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

  private async cargarResumen(): Promise<void> {
    const { data, error } = await this.supabase.funcion<ResumenUsuarioCrudo[]>(
      'fn_resumen_usuario',
      { p_usuario: this.usuarioActivoId },
    );

    if (error) {
      throw error;
    }

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

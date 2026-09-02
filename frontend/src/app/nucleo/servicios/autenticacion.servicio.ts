import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SupabaseServicio } from './supabase.servicio';
import { registrarError } from '../utilidades/errores.util';

/**
 * SERVICIO DE AUTENTICACIÓN
 * -----------------------------------------------------------------------------
 * Administra el ciclo de vida de la sesión del usuario:
 *   - Inicio de sesión y registro con Supabase Auth (email y contraseña).
 *   - Modo demo para entrar con el usuario predeterminado (William Grace).
 *   - Detección de cambios de sesión en tiempo real y persistencia en localStorage.
 *   - Provisión automática de perfiles en `public.usuarios` para nuevos usuarios.
 */
@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly router = inject(Router);

  private readonly CLAVE_MODO_DEMO = 'payline_modo_demo';

  // --- Señales de estado ---
  private readonly _sesion = signal<Session | null>(null);
  private readonly _cargando = signal<boolean>(true);
  private readonly _esModoDemo = signal<boolean>(false);

  readonly sesion = this._sesion.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly esModoDemo = this._esModoDemo.asReadonly();

  /** true si el usuario ha iniciado sesión por Supabase Auth o está en modo demo. */
  readonly autenticado = computed(() => Boolean(this._sesion()) || this._esModoDemo());

  /**
   * Id del usuario actualmente activo.
   * Si está en modo demo, devuelve el UUID de demostración fijado.
   * Si está autenticado por Supabase Auth, devuelve auth.uid().
   */
  readonly usuarioActivoId = computed<string | null>(() => {
    if (this._esModoDemo()) {
      return environment.usuarioDemoId;
    }
    return this._sesion()?.user?.id ?? null;
  });

  /** Usuario de Supabase Auth (si no está en modo demo). */
  readonly usuarioAuth = computed<User | null>(() => this._sesion()?.user ?? null);

  constructor() {
    this.inicializar();
  }

  /**
   * Comprueba la sesión existente al cargar la aplicación.
   */
  private async inicializar(): Promise<void> {
    try {
      // 1. Verificamos si estaba activo el modo demo
      const demoGuardado =
        typeof localStorage !== 'undefined' && localStorage.getItem(this.CLAVE_MODO_DEMO) === 'true';
      if (demoGuardado) {
        this._esModoDemo.set(true);
      }

      // 2. Leemos la sesión persistida de Supabase Auth
      const { data, error } = await this.supabase.cliente.auth.getSession();
      if (!error && data?.session) {
        this._sesion.set(data.session);
        // Si hay una sesión real de Auth, desactivamos el modo demo
        this._esModoDemo.set(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.CLAVE_MODO_DEMO);
        }
      }

      // 3. Escuchamos cambios de estado de autenticación de Supabase
      this.supabase.cliente.auth.onAuthStateChange((_evento, sesion) => {
        this._sesion.set(sesion);
        if (sesion) {
          this._esModoDemo.set(false);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(this.CLAVE_MODO_DEMO);
          }
        }
      });
    } catch (error) {
      registrarError('AutenticacionServicio.inicializar', error);
    } finally {
      this._cargando.set(false);
    }
  }

  /**
   * Inicia sesión con correo y contraseña en Supabase Auth.
   */
  async iniciarSesion(correo: string, contrasena: string): Promise<void> {
    this._cargando.set(true);

    try {
      const { data, error } = await this.supabase.cliente.auth.signInWithPassword({
        email: correo.trim(),
        password: contrasena,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No se pudo iniciar sesión. Revisa tus credenciales.');
      }

      this._sesion.set(data.session);
      this._esModoDemo.set(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.CLAVE_MODO_DEMO);
      }

      // Aseguramos que exista una fila en public.usuarios para este usuario
      await this.asegurarPerfilUsuario(data.user);
    } finally {
      this._cargando.set(false);
    }
  }

  /**
   * Registra un nuevo usuario en Supabase Auth y crea su fila en public.usuarios.
   */
  async registrarse(
    nombreCompleto: string,
    correo: string,
    contrasena: string,
  ): Promise<{ requiereConfirmacion: boolean }> {
    this._cargando.set(true);

    try {
      const nombreLimpio = nombreCompleto.trim();
      const correoLimpio = correo.trim();

      const { data, error } = await this.supabase.cliente.auth.signUp({
        email: correoLimpio,
        password: contrasena,
        options: {
          data: {
            nombre_completo: nombreLimpio,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo crear la cuenta.');
      }

      // Si Supabase no requiere confirmación de correo o devuelve sesión de inmediato:
      if (data.session) {
        this._sesion.set(data.session);
        this._esModoDemo.set(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.CLAVE_MODO_DEMO);
        }
        await this.asegurarPerfilUsuario(data.user, nombreLimpio);
        return { requiereConfirmacion: false };
      }

      // Si requiere confirmación de email:
      return { requiereConfirmacion: true };
    } finally {
      this._cargando.set(false);
    }
  }

  /**
   * Entra en modo demostración con el usuario fijado (William Grace).
   */
  iniciarSesionDemo(): void {
    this._esModoDemo.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CLAVE_MODO_DEMO, 'true');
    }
  }

  /**
   * Cierra la sesión activa y redirige a /login.
   */
  async cerrarSesion(): Promise<void> {
    this._cargando.set(true);

    try {
      if (this._sesion()) {
        await this.supabase.cliente.auth.signOut();
      }
      this._sesion.set(null);
      this._esModoDemo.set(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.CLAVE_MODO_DEMO);
      }
      await this.router.navigate(['/login']);
    } finally {
      this._cargando.set(false);
    }
  }

  /**
   * Verifica si existe la fila de perfil en `public.usuarios` y la crea si no está.
   */
  async asegurarPerfilUsuario(user: User, nombrePredeterminado?: string): Promise<void> {
    try {
      const { data: existente } = await this.supabase
        .tabla('usuarios')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existente) {
        const nombre =
          nombrePredeterminado ||
          (user.user_metadata?.['nombre_completo'] as string) ||
          user.email?.split('@')[0] ||
          'Usuario';

        await this.supabase.tabla('usuarios').insert({
          id: user.id,
          nombre_completo: nombre,
          correo: user.email,
          rol: 'ADMIN',
          color_avatar: '#5B4DF0',
          moneda_base: 'EUR',
        });
      }
    } catch (error) {
      registrarError('AutenticacionServicio.asegurarPerfilUsuario', error);
    }
  }
}

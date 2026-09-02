import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SupabaseServicio } from './supabase.servicio';
import { registrarError } from '../utilidades/errores.util';

@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly router = inject(Router);

  private readonly CLAVE_MODO_DEMO = 'payline_modo_demo';

  private readonly _sesion = signal<Session | null>(null);
  private readonly _cargando = signal<boolean>(true);
  private readonly _esModoDemo = signal<boolean>(false);

  readonly sesion = this._sesion.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly esModoDemo = this._esModoDemo.asReadonly();

  readonly autenticado = computed(() => Boolean(this._sesion()) || this._esModoDemo());

  readonly usuarioActivoId = computed<string | null>(() => {
    if (this._esModoDemo()) {
      return environment.usuarioDemoId;
    }
    return this._sesion()?.user?.id ?? null;
  });

  readonly usuarioAuth = computed<User | null>(() => this._sesion()?.user ?? null);

  constructor() {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    try {
      const demoGuardado =
        typeof localStorage !== 'undefined' && localStorage.getItem(this.CLAVE_MODO_DEMO) === 'true';
      if (demoGuardado) {
        this._esModoDemo.set(true);
      }

      const { data, error } = await this.supabase.cliente.auth.getSession();
      if (!error && data?.session) {
        this._sesion.set(data.session);
        this._esModoDemo.set(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.CLAVE_MODO_DEMO);
        }
      }

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

      await this.asegurarPerfilUsuario(data.user);
    } finally {
      this._cargando.set(false);
    }
  }

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

      if (data.session) {
        this._sesion.set(data.session);
        this._esModoDemo.set(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.CLAVE_MODO_DEMO);
        }
        await this.asegurarPerfilUsuario(data.user, nombreLimpio);
        return { requiereConfirmacion: false };
      }

      return { requiereConfirmacion: true };
    } finally {
      this._cargando.set(false);
    }
  }

  iniciarSesionDemo(): void {
    this._esModoDemo.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CLAVE_MODO_DEMO, 'true');
    }
  }

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

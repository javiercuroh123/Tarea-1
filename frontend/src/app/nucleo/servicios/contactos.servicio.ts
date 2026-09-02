import { Injectable, inject, signal } from '@angular/core';
import { Contacto, EstadoCarga } from '../modelos';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { UsuariosServicio } from './usuarios.servicio';

@Injectable({ providedIn: 'root' })
export class ContactosServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly usuarios = inject(UsuariosServicio);

  private readonly _contactos = signal<Contacto[]>([]);
  private readonly _estado = signal<EstadoCarga>('inactivo');
  private readonly _error = signal<string | null>(null);

  readonly contactos = this._contactos.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly error = this._error.asReadonly();

  async cargar(): Promise<void> {
    this._estado.set('cargando');
    this._error.set(null);

    try {
      const { data, error } = await this.supabase
        .tabla('contactos')
        .select('*')
        .eq('usuario_id', this.usuarios.usuarioActivoId)
        .order('favorito', { ascending: false })
        .order('nombre', { ascending: true });

      if (error) {
        throw error;
      }

      this._contactos.set((data ?? []) as Contacto[]);
      this._estado.set('listo');
    } catch (error) {
      registrarError('ContactosServicio.cargar', error);
      this._error.set(mensajeDeError(error, 'No se pudieron cargar los contactos.'));
      this._estado.set('error');
    }
  }

  porId(id: string): Contacto | undefined {
    return this._contactos().find((contacto) => contacto.id === id);
  }

  async obtenerUsuariosRegistrados(): Promise<import('../modelos').Usuario[]> {
    try {
      const { data, error } = await this.supabase
        .tabla('usuarios')
        .select('*')
        .neq('id', this.usuarios.usuarioActivoId)
        .order('nombre_completo', { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as import('../modelos').Usuario[];
    } catch (error) {
      registrarError('ContactosServicio.obtenerUsuariosRegistrados', error);
      return [];
    }
  }

  async crear(datos: {
    nombre: string;
    correo?: string;
    color_avatar?: string;
    moneda_preferida?: import('../modelos').CodigoMoneda;
    favorito?: boolean;
  }): Promise<Contacto> {
    try {
      const nuevoContacto = {
        usuario_id: this.usuarios.usuarioActivoId,
        nombre: datos.nombre.trim(),
        correo: datos.correo ? datos.correo.trim().toLowerCase() : null,
        color_avatar: datos.color_avatar ?? '#6C5CE7',
        moneda_preferida: datos.moneda_preferida ?? 'USD',
        favorito: datos.favorito ?? false,
      };

      const { data, error } = await this.supabase
        .tabla('contactos')
        .insert(nuevoContacto)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const creado = data as Contacto;
      this._contactos.update((actuales) => [creado, ...actuales]);
      return creado;
    } catch (error) {
      registrarError('ContactosServicio.crear', error);
      throw new Error(mensajeDeError(error, 'No se pudo guardar el contacto.'));
    }
  }
}

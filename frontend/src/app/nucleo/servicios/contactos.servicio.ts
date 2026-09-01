import { Injectable, inject, signal } from '@angular/core';
import { Contacto, EstadoCarga } from '../modelos';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { UsuariosServicio } from './usuarios.servicio';

/**
 * SERVICIO DE CONTACTOS
 * -----------------------------------------------------------------------------
 * Lista los destinatarios frecuentes que se ven como avatares en el widget
 * «Transferencia rápida».
 */
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

  /**
   * Carga los contactos del usuario activo.
   * El orden (favoritos primero, luego alfabético) coincide con el índice
   * `idx_contactos_usuario` de la base de datos, así que PostgreSQL lo resuelve
   * sin ordenar nada en memoria.
   */
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

  /** Busca un contacto ya cargado por su id (sin volver al servidor). */
  porId(id: string): Contacto | undefined {
    return this._contactos().find((contacto) => contacto.id === id);
  }
}

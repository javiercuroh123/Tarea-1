import { Injectable, computed, inject, signal } from '@angular/core';
import { Notificacion } from '../modelos';
import { registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { UsuariosServicio } from './usuarios.servicio';

/**
 * SERVICIO DE NOTIFICACIONES
 * -----------------------------------------------------------------------------
 * Alimenta la campana del encabezado: lista de avisos y contador de no leídas.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly usuarios = inject(UsuariosServicio);

  private readonly _notificaciones = signal<Notificacion[]>([]);
  readonly notificaciones = this._notificaciones.asReadonly();

  /** Número de avisos sin leer: es lo que muestra el punto rojo. */
  readonly sinLeer = computed(
    () => this._notificaciones().filter((n) => !n.leida).length,
  );

  /** Trae las notificaciones más recientes del usuario activo. */
  async cargar(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .tabla('notificaciones')
        .select('*')
        .eq('usuario_id', this.usuarios.usuarioActivoId)
        .order('creado_en', { ascending: false })
        .limit(10);   // la campana no necesita más

      if (error) {
        throw error;
      }

      this._notificaciones.set((data ?? []) as Notificacion[]);
    } catch (error) {
      registrarError('NotificacionesServicio.cargar', error);
    }
  }

  /**
   * Marca todas como leídas.
   *
   * Actualiza PRIMERO la interfaz y luego el servidor («actualización
   * optimista»): la campana responde al instante. Si el servidor falla,
   * recargamos para volver al estado real.
   */
  async marcarTodasLeidas(): Promise<void> {
    const anteriores = this._notificaciones();

    this._notificaciones.update((lista) =>
      lista.map((n) => ({ ...n, leida: true })),
    );

    try {
      const { error } = await this.supabase
        .tabla('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', this.usuarios.usuarioActivoId)
        .eq('leida', false);

      if (error) {
        throw error;
      }
    } catch (error) {
      registrarError('NotificacionesServicio.marcarTodasLeidas', error);
      // Deshacemos el cambio optimista.
      this._notificaciones.set(anteriores);
    }
  }
}

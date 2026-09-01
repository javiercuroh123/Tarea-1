import { Injectable, inject, signal } from '@angular/core';
import { Comercio } from '../modelos';
import { registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';

/**
 * SERVICIO DE COMERCIOS
 * -----------------------------------------------------------------------------
 * El catálogo de comercios es pequeño y no cambia casi nunca, así que lo
 * cargamos UNA vez y lo guardamos en memoria (caché). Las siguientes llamadas
 * a `cargar()` no vuelven a molestar al servidor.
 */
@Injectable({ providedIn: 'root' })
export class ComerciosServicio {
  private readonly supabase = inject(SupabaseServicio);

  private readonly _comercios = signal<Comercio[]>([]);
  readonly comercios = this._comercios.asReadonly();

  /** Marca de caché: evita repetir la consulta. */
  private yaCargado = false;

  /**
   * @param forzar Si es true ignora la caché y vuelve a consultar.
   */
  async cargar(forzar = false): Promise<void> {
    if (this.yaCargado && !forzar) {
      return;
    }

    try {
      const { data, error } = await this.supabase
        .tabla('comercios')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        throw error;
      }

      this._comercios.set((data ?? []) as Comercio[]);
      this.yaCargado = true;
    } catch (error) {
      // Un fallo aquí no debe romper la pantalla: el desplegable de filtros
      // simplemente saldrá vacío.
      registrarError('ComerciosServicio.cargar', error);
    }
  }
}

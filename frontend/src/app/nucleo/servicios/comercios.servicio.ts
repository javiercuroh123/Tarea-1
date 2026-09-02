import { Injectable, inject, signal } from '@angular/core';
import { Comercio } from '../modelos';
import { registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';

@Injectable({ providedIn: 'root' })
export class ComerciosServicio {
  private readonly supabase = inject(SupabaseServicio);

  private readonly _comercios = signal<Comercio[]>([]);
  readonly comercios = this._comercios.asReadonly();

  private yaCargado = false;

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
      registrarError('ComerciosServicio.cargar', error);
    }
  }
}

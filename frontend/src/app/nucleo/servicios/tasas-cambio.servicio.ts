import { Injectable, inject, signal } from '@angular/core';
import { CodigoMoneda, TasaCambio } from '../modelos';
import { aNumero } from '../utilidades/formato.util';
import { registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';

@Injectable({ providedIn: 'root' })
export class TasasCambioServicio {
  private readonly supabase = inject(SupabaseServicio);

  private readonly _tasas = signal<TasaCambio[]>([]);
  readonly tasas = this._tasas.asReadonly();

  private yaCargado = false;

  async cargar(forzar = false): Promise<void> {
    if (this.yaCargado && !forzar) {
      return;
    }

    try {
      const { data, error } = await this.supabase.tabla('tasas_cambio').select('*');

      if (error) {
        throw error;
      }

      const tasas = (data ?? []).map((fila: Record<string, unknown>) => ({
        ...(fila as unknown as TasaCambio),
        tasa: aNumero(fila['tasa'] as string),
      }));

      this._tasas.set(tasas);
      this.yaCargado = true;
    } catch (error) {
      registrarError('TasasCambioServicio.cargar', error);
    }
  }

  obtenerTasa(origen: CodigoMoneda, destino: CodigoMoneda): number {
    if (origen === destino) {
      return 1;
    }

    const lista = this._tasas();

    const directa = lista.find(
      (t) => t.moneda_origen === origen && t.moneda_destino === destino,
    );
    if (directa) {
      return directa.tasa;
    }

    const inversa = lista.find(
      (t) => t.moneda_origen === destino && t.moneda_destino === origen,
    );
    if (inversa && inversa.tasa !== 0) {
      return 1 / inversa.tasa;
    }

    return 1;
  }

  convertir(monto: number, origen: CodigoMoneda, destino: CodigoMoneda): number {
    const resultado = monto * this.obtenerTasa(origen, destino);
    return Math.round(resultado * 100) / 100;
  }
}

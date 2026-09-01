import { Injectable, inject, signal } from '@angular/core';
import { CodigoMoneda, TasaCambio } from '../modelos';
import { aNumero } from '../utilidades/formato.util';
import { registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';

/**
 * SERVICIO DE TASAS DE CAMBIO
 * -----------------------------------------------------------------------------
 * Descarga la tabla de tasas una sola vez y hace la conversión en el navegador.
 *
 * ¿Por qué no llamar a la RPC `fn_obtener_tasa` en cada tecleo? Porque el
 * widget de transferencia convierte MIENTRAS se escribe: una petición por cada
 * pulsación sería un desperdicio. La tabla es diminuta, así que la traemos
 * entera y calculamos al instante.
 *
 * La conversión definitiva la vuelve a hacer el servidor al registrar la
 * transferencia, así que el importe guardado nunca depende del navegador.
 */
@Injectable({ providedIn: 'root' })
export class TasasCambioServicio {
  private readonly supabase = inject(SupabaseServicio);

  private readonly _tasas = signal<TasaCambio[]>([]);
  readonly tasas = this._tasas.asReadonly();

  private yaCargado = false;

  /** Descarga la tabla de tasas (una única vez). */
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

  /**
   * Devuelve la tasa entre dos monedas.
   * Misma lógica que la función SQL `fn_obtener_tasa`:
   *   1. misma moneda -> 1
   *   2. par directo   (EUR -> USD)
   *   3. par inverso   (1 / la tasa USD -> EUR)
   *   4. sin datos     -> 1
   */
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

  /** Convierte un importe redondeando a dos decimales, como hace la BD. */
  convertir(monto: number, origen: CodigoMoneda, destino: CodigoMoneda): number {
    const resultado = monto * this.obtenerTasa(origen, destino);
    return Math.round(resultado * 100) / 100;
  }
}

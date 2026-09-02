import { Injectable, inject, signal } from '@angular/core';
import { CodigoMoneda, Transferencia } from '../modelos';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { UsuariosServicio } from './usuarios.servicio';

@Injectable({ providedIn: 'root' })
export class TransferenciasServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly usuarios = inject(UsuariosServicio);

  private readonly _enviando = signal(false);
  readonly enviando = this._enviando.asReadonly();

  private readonly _ultimaTransferencia = signal<Transferencia | null>(null);
  readonly ultimaTransferencia = this._ultimaTransferencia.asReadonly();

  async enviar(datos: {
    contactoId: string;
    monto: number;
    monedaOrigen: CodigoMoneda;
    monedaDestino: CodigoMoneda;
    nota?: string | null;
  }): Promise<Transferencia> {
    if (!datos.contactoId) {
      throw new Error('Selecciona un destinatario.');
    }
    if (!Number.isFinite(datos.monto) || datos.monto <= 0) {
      throw new Error('El importe debe ser mayor que cero.');
    }

    this._enviando.set(true);

    try {
      const { data, error } = await this.supabase.funcion<Transferencia>(
        'fn_registrar_transferencia',
        {
          p_usuario_id: this.usuarios.usuarioActivoId,
          p_contacto_id: datos.contactoId,
          p_monto: datos.monto,
          p_moneda_origen: datos.monedaOrigen,
          p_moneda_destino: datos.monedaDestino,
          p_nota: datos.nota ?? null,
        },
      );

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('El servidor no devolvió la transferencia.');
      }

      this._ultimaTransferencia.set(data);
      return data;
    } catch (error) {
      registrarError('TransferenciasServicio.enviar', error);
      throw new Error(mensajeDeError(error, 'No se pudo enviar la transferencia.'));
    } finally {
      this._enviando.set(false);
    }
  }
}

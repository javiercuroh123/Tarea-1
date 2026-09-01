import { Injectable, inject, signal } from '@angular/core';
import { CodigoMoneda, Transferencia } from '../modelos';
import { mensajeDeError, registrarError } from '../utilidades/errores.util';
import { SupabaseServicio } from './supabase.servicio';
import { UsuariosServicio } from './usuarios.servicio';

/**
 * SERVICIO DE TRANSFERENCIAS
 * -----------------------------------------------------------------------------
 * Envía dinero a un contacto llamando a la función `fn_registrar_transferencia`.
 *
 * ¿Por qué una función RPC y no tres `insert` desde el navegador?
 * Porque la operación tiene TRES pasos (transferencia + transacción +
 * notificación) que deben cumplirse todos o ninguno. Dentro de una función de
 * PostgreSQL van en la misma transacción: si el tercer paso falla, los dos
 * anteriores se deshacen solos. Desde el navegador podríamos quedarnos con
 * datos a medias si se corta la conexión entre una llamada y otra.
 */
@Injectable({ providedIn: 'root' })
export class TransferenciasServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly usuarios = inject(UsuariosServicio);

  /** true mientras se está enviando (para deshabilitar el botón). */
  private readonly _enviando = signal(false);
  readonly enviando = this._enviando.asReadonly();

  private readonly _ultimaTransferencia = signal<Transferencia | null>(null);
  readonly ultimaTransferencia = this._ultimaTransferencia.asReadonly();

  /**
   * Registra una transferencia.
   *
   * @throws Error con un mensaje ya traducido si algo falla; el componente solo
   *         tiene que mostrarlo.
   */
  async enviar(datos: {
    contactoId: string;
    monto: number;
    monedaOrigen: CodigoMoneda;
    monedaDestino: CodigoMoneda;
    nota?: string | null;
  }): Promise<Transferencia> {
    // Validación en el navegador: respuesta inmediata al usuario.
    // La base de datos vuelve a validar (check `monto_origen > 0`): nunca se
    // confía solo en la validación del cliente.
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
      // `finally` se ejecuta tanto si va bien como si falla: el botón siempre
      // vuelve a habilitarse.
      this._enviando.set(false);
    }
  }
}

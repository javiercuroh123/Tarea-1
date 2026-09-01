import { Injectable, signal } from '@angular/core';
import { Aviso } from '../modelos';

/**
 * SERVICIO DE AVISOS (toasts)
 * -----------------------------------------------------------------------------
 * Muestra mensajes breves en la esquina de la pantalla: «Transferencia enviada»,
 * «No se pudo guardar»...
 *
 * Es un servicio de INTERFAZ, no toca la base de datos. Guarda su estado en un
 * `signal`, de modo que el componente que los pinta se actualiza solo cuando la
 * lista cambia (sin necesidad de Zone.js: la app es *zoneless*).
 */
@Injectable({ providedIn: 'root' })
export class AvisosServicio {
  /** Contador para dar un id único a cada aviso. */
  private siguienteId = 0;

  /** Señal privada de escritura: solo este servicio puede modificarla. */
  private readonly _avisos = signal<Aviso[]>([]);

  /** Señal pública de solo lectura para los componentes. */
  readonly avisos = this._avisos.asReadonly();

  /** Milisegundos que permanece visible cada aviso. */
  private readonly DURACION_MS = 4000;

  /** Aviso de operación correcta (verde). */
  exito(texto: string): void {
    this.mostrar('exito', texto);
  }

  /** Aviso de error (rojo). */
  error(texto: string): void {
    this.mostrar('error', texto);
  }

  /** Aviso informativo (neutro). */
  info(texto: string): void {
    this.mostrar('info', texto);
  }

  /** Cierra un aviso concreto (al pulsar la «x» o al agotarse el tiempo). */
  cerrar(id: number): void {
    this._avisos.update((lista) => lista.filter((aviso) => aviso.id !== id));
  }

  /** Lógica común de los tres métodos públicos. */
  private mostrar(tipo: Aviso['tipo'], texto: string): void {
    const id = ++this.siguienteId;

    // `update` recibe la lista actual y devuelve la nueva (inmutabilidad).
    this._avisos.update((lista) => [...lista, { id, tipo, texto }]);

    // Se cierra solo pasado un tiempo.
    setTimeout(() => this.cerrar(id), this.DURACION_MS);
  }
}

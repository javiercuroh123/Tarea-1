import { Injectable, signal } from '@angular/core';
import { Aviso } from '../modelos';

@Injectable({ providedIn: 'root' })
export class AvisosServicio {
  private siguienteId = 0;

  private readonly _avisos = signal<Aviso[]>([]);

  readonly avisos = this._avisos.asReadonly();

  private readonly DURACION_MS = 4000;

  exito(texto: string): void {
    this.mostrar('exito', texto);
  }

  error(texto: string): void {
    this.mostrar('error', texto);
  }

  info(texto: string): void {
    this.mostrar('info', texto);
  }

  cerrar(id: number): void {
    this._avisos.update((lista) => lista.filter((aviso) => aviso.id !== id));
  }

  private mostrar(tipo: Aviso['tipo'], texto: string): void {
    const id = ++this.siguienteId;

    this._avisos.update((lista) => [...lista, { id, tipo, texto }]);

    setTimeout(() => this.cerrar(id), this.DURACION_MS);
  }
}

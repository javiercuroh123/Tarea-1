import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * SERVICIO SUPABASE
 * -----------------------------------------------------------------------------
 * Única puerta de entrada a la base de datos. Crea el cliente de Supabase UNA
 * sola vez (`providedIn: 'root'` = instancia compartida por toda la app) y lo
 * ofrece al resto de servicios.
 *
 * ¿Por qué un servicio y no llamar a `createClient` en cada sitio?
 *   - Se crearían varias conexiones y varios canales en tiempo real.
 *   - La URL y la clave estarían repartidas por el código.
 *   - No habría un lugar donde centralizar el tratamiento de errores.
 *
 * NINGÚN componente debe usar este servicio directamente: los componentes
 * hablan con los servicios de dominio (transacciones, contactos...), y son
 * esos servicios los que usan este.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseServicio {
  /**
   * Cliente de Supabase.
   * `readonly` para que nadie pueda sustituirlo desde fuera.
   */
  readonly cliente: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseClaveAnonima,
    {
      auth: {
        // Este proyecto no usa login, así que desactivamos el guardado de
        // sesión para no dejar datos innecesarios en el navegador.
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    },
  );

  /**
   * Atajo para consultar una tabla o vista.
   * Ejemplo: `this.supabase.tabla('comercios').select('*')`
   */
  tabla(nombre: string) {
    return this.cliente.from(nombre);
  }

  /**
   * Atajo para llamar a una función de PostgreSQL (RPC).
   * Ejemplo: `this.supabase.funcion('fn_volumen_pagos', { p_usuario, p_dias })`
   */
  funcion<T>(nombre: string, parametros: Record<string, unknown> = {}) {
    return this.cliente.rpc(nombre, parametros) as unknown as Promise<{
      data: T | null;
      error: { message: string } | null;
    }>;
  }
}

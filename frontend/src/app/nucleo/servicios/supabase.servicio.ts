import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseServicio {
  readonly cliente: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseClaveAnonima,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
    },
  );

  tabla(nombre: string) {
    return this.cliente.from(nombre);
  }

  funcion<T>(nombre: string, parametros: Record<string, unknown> = {}) {
    return this.cliente.rpc(nombre, parametros) as unknown as Promise<{
      data: T | null;
      error: { message: string } | null;
    }>;
  }
}

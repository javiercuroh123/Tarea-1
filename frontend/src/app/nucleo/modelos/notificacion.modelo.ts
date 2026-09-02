export interface Notificacion {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string | null;
  leida: boolean;
  creado_en: string;
}

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}

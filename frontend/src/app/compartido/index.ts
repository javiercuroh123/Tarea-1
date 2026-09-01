/**
 * PUNTO DE ENTRADA ÚNICO DE LA CAPA COMPARTIDA.
 *
 * Todo lo reutilizable (componentes de presentación y pipes) se exporta aquí:
 *
 *     import { Tarjeta, Avatar, MontoPipe } from '../../compartido';
 *
 * Los componentes de esta carpeta son «tontos» a propósito: reciben datos por
 * `input()` y avisan con `output()`. No conocen Supabase ni los servicios de
 * dominio, así que se pueden reutilizar en cualquier pantalla.
 */

// --- Componentes ------------------------------------------------------------
export * from './componentes/icono/icono';
export * from './componentes/avatar/avatar';
export * from './componentes/etiqueta-estado/etiqueta-estado';
export * from './componentes/tarjeta/tarjeta';
export * from './componentes/metrica/metrica';
export * from './componentes/esqueleto/esqueleto';
export * from './componentes/estado-vacio/estado-vacio';
export * from './componentes/avisos/avisos';

// --- Pipes ------------------------------------------------------------------
export * from './pipes/monto.pipe';
export * from './pipes/fecha-transaccion.pipe';

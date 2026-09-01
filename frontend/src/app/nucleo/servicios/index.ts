/**
 * PUNTO DE ENTRADA ÚNICO DE LOS SERVICIOS (patrón «barrel»).
 *
 *     import { TransaccionesServicio, AvisosServicio } from '../../nucleo/servicios';
 */

export * from './supabase.servicio';
export * from './usuarios.servicio';
export * from './contactos.servicio';
export * from './comercios.servicio';
export * from './transacciones.servicio';
export * from './transferencias.servicio';
export * from './tasas-cambio.servicio';
export * from './notificaciones.servicio';
export * from './avisos.servicio';

/**
 * PUNTO DE ENTRADA ÚNICO DE LOS MODELOS (patrón «barrel»).
 *
 * Gracias a este archivo, el resto de la aplicación importa así:
 *
 *     import { Transaccion, Contacto } from '../../nucleo/modelos';
 *
 * en lugar de escribir una línea de import por cada archivo.
 */

export * from './comunes.modelo';
export * from './usuario.modelo';
export * from './contacto.modelo';
export * from './comercio.modelo';
export * from './transaccion.modelo';
export * from './transferencia.modelo';
export * from './notificacion.modelo';

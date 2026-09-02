import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionServicio } from '../servicios';

/**
 * GUARDA DE AUTENTICACIÓN
 * -----------------------------------------------------------------------------
 * Protege las pantallas privadas del panel. Si el usuario no ha iniciado sesión
 * (ni en Supabase Auth ni en Modo Demo), se le redirige a /login.
 */
export const autenticacionGuard: CanActivateFn = () => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * GUARDA DE PÁGINA PÚBLICA (LOGIN)
 * -----------------------------------------------------------------------------
 * Si un usuario con sesión iniciada intenta abrir /login, se le redirige
 * automáticamente al panel principal.
 */
export const publicoGuard: CanActivateFn = () => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);

  if (auth.autenticado()) {
    return router.createUrlTree(['/transacciones']);
  }

  return true;
};

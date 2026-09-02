import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionServicio } from '../servicios';

export const autenticacionGuard: CanActivateFn = () => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const publicoGuard: CanActivateFn = () => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);

  if (auth.autenticado()) {
    return router.createUrlTree(['/transacciones']);
  }

  return true;
};

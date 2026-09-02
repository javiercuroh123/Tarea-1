import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AutenticacionServicio, AvisosServicio } from '../../../../nucleo/servicios';
import { mensajeDeError } from '../../../../nucleo/utilidades/errores.util';
import { Icono } from '../../../../compartido';

/**
 * PÁGINA DE LOGIN Y REGISTRO
 * -----------------------------------------------------------------------------
 * Permite:
 *   1. Iniciar sesión con email y contraseña (Supabase Auth).
 *   2. Registrar una nueva cuenta de usuario.
 *   3. Acceso rápido con 1 clic en Modo Demostración (William Grace).
 */
@Component({
  selector: 'app-login-pagina',
  imports: [FormsModule, Icono],
  templateUrl: './login-pagina.html',
  styleUrl: './login-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPagina {
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly avisos = inject(AvisosServicio);

  // --- Estado ---
  readonly modo = signal<'login' | 'registro'>('login');
  readonly nombreCompleto = signal('');
  readonly correo = signal('');
  readonly contrasena = signal('');
  readonly cargando = signal(false);
  readonly errorMensaje = signal<string | null>(null);
  readonly infoMensaje = signal<string | null>(null);

  /** Cambia entre pestaña de login y registro. */
  cambiarModo(nuevoModo: 'login' | 'registro'): void {
    this.modo.set(nuevoModo);
    this.errorMensaje.set(null);
    this.infoMensaje.set(null);
  }

  /** Procesa el envío del formulario según el modo activo. */
  async onSubmit(evento: Event): Promise<void> {
    evento.preventDefault();
    this.errorMensaje.set(null);
    this.infoMensaje.set(null);

    const email = this.correo().trim();
    const pass = this.contrasena();

    if (!email || !pass) {
      this.errorMensaje.set('Por favor completa todos los campos requeridos.');
      return;
    }

    if (pass.length < 6) {
      this.errorMensaje.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.cargando.set(true);

    try {
      if (this.modo() === 'login') {
        await this.auth.iniciarSesion(email, pass);
        this.avisos.exito('¡Bienvenido de nuevo!');
        await this.router.navigate(['/transacciones']);
      } else {
        const nombre = this.nombreCompleto().trim();
        if (!nombre) {
          this.errorMensaje.set('Introduce tu nombre completo.');
          this.cargando.set(false);
          return;
        }

        const res = await this.auth.registrarse(nombre, email, pass);
        if (res.requiereConfirmacion) {
          this.infoMensaje.set(
            '¡Cuenta creada con éxito! Por favor revisa tu correo electrónico para confirmar la cuenta antes de iniciar sesión.',
          );
        } else {
          this.avisos.exito('¡Cuenta creada correctamente!');
          await this.router.navigate(['/transacciones']);
        }
      }
    } catch (error) {
      this.errorMensaje.set(mensajeDeError(error, 'Ocurrió un error al procesar tu solicitud.'));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Acceso inmediato en Modo Demostración sin credenciales. */
  async entrarComoDemo(): Promise<void> {
    this.auth.iniciarSesionDemo();
    this.avisos.info('Iniciando sesión como William Grace (Demo)...');
    await this.router.navigate(['/transacciones']);
  }
}

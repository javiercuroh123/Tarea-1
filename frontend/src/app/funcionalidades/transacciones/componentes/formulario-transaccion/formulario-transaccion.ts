import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AvisosServicio,
  ComerciosServicio,
  TransaccionesServicio,
  UsuariosServicio,
} from '../../../../nucleo/servicios';
import { CodigoMoneda, EstadoTransaccion, TipoTransaccion } from '../../../../nucleo/modelos';
import { Icono } from '../../../../compartido';

/**
 * FORMULARIO DE NUEVA TRANSACCIÓN
 * -----------------------------------------------------------------------------
 * Ventana modal para dar de alta un movimiento a mano.
 *
 * Usa FORMULARIOS REACTIVOS (`ReactiveFormsModule`) en lugar de `ngModel`:
 *   - las validaciones se declaran en un único sitio,
 *   - el estado del formulario (válido, tocado, con errores) es consultable,
 *   - es la opción recomendada por Angular para formularios con reglas.
 *
 * La validación del navegador NO sustituye a la de la base de datos: las
 * restricciones `check` del SQL siguen siendo la última palabra.
 */
@Component({
  selector: 'app-formulario-transaccion',
  imports: [ReactiveFormsModule, Icono],
  templateUrl: './formulario-transaccion.html',
  styleUrl: './formulario-transaccion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioTransaccion implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly comerciosServicio = inject(ComerciosServicio);
  private readonly transacciones = inject(TransaccionesServicio);
  private readonly usuarios = inject(UsuariosServicio);
  private readonly avisos = inject(AvisosServicio);

  /** Se emite cuando hay que cerrar la ventana. */
  readonly cerrar = output<void>();

  /** Catálogo para el desplegable de comercios. */
  readonly comercios = this.comerciosServicio.comercios;

  /** true mientras se está guardando. */
  readonly guardando = signal(false);

  readonly monedas: readonly CodigoMoneda[] = ['USD', 'EUR', 'GBP', 'PEN'];
  readonly tipos: ReadonlyArray<{ valor: TipoTransaccion; texto: string }> = [
    { valor: 'egreso', texto: 'Gasto' },
    { valor: 'ingreso', texto: 'Ingreso' },
  ];
  readonly estados: ReadonlyArray<{ valor: EstadoTransaccion; texto: string }> = [
    { valor: 'completada', texto: 'Completada' },
    { valor: 'pendiente', texto: 'Pendiente' },
    { valor: 'fallida', texto: 'Fallida' },
  ];

  /**
   * Definición del formulario con sus validaciones.
   * `nonNullable: true` evita que los campos vuelvan a null al reiniciarlos.
   */
  readonly formulario = this.fb.nonNullable.group({
    comercio_id: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['USD' as CodigoMoneda, Validators.required],
    tipo: ['egreso' as TipoTransaccion, Validators.required],
    estado: ['completada' as EstadoTransaccion, Validators.required],
    descripcion: ['', [Validators.maxLength(120)]],
    // Por defecto, la fecha de hoy en formato yyyy-mm-dd.
    fecha: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  ngOnInit(): void {
    void this.comerciosServicio.cargar();
  }

  /** Atajo para consultar si un campo debe mostrar su error. */
  tieneError(campo: string): boolean {
    const control = this.formulario.get(campo);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  /** Guarda la transacción. */
  async guardar(): Promise<void> {
    // Si el formulario no es válido, marcamos todo como «tocado» para que se
    // vean los mensajes de error y salimos.
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const valores = this.formulario.getRawValue();

    try {
      await this.transacciones.crear({
        usuario_id: this.usuarios.usuarioActivoId,
        comercio_id: valores.comercio_id || null,
        monto: Number(valores.monto),
        moneda: valores.moneda,
        tipo: valores.tipo,
        estado: valores.estado,
        descripcion: valores.descripcion.trim() || null,
        // Añadimos una hora para guardar una marca de tiempo completa.
        fecha: `${valores.fecha}T12:00:00`,
      });

      this.avisos.exito('Transacción creada correctamente.');
      this.cerrar.emit();
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}

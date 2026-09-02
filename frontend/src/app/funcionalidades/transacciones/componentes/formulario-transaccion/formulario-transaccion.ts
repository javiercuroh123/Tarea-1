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

  readonly cerrar = output<void>();

  readonly comercios = this.comerciosServicio.comercios;

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

  readonly formulario = this.fb.nonNullable.group({
    comercio_id: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['USD' as CodigoMoneda, Validators.required],
    tipo: ['egreso' as TipoTransaccion, Validators.required],
    estado: ['completada' as EstadoTransaccion, Validators.required],
    descripcion: ['', [Validators.maxLength(120)]],
    fecha: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  ngOnInit(): void {
    void this.comerciosServicio.cargar();
  }

  tieneError(campo: string): boolean {
    const control = this.formulario.get(campo);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  async guardar(): Promise<void> {
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

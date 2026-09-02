import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvisosServicio,
  ContactosServicio,
  TasasCambioServicio,
  TransaccionesServicio,
  TransferenciasServicio,
  UsuariosServicio,
} from '../../../../nucleo/servicios';
import { CodigoMoneda, SIMBOLOS_MONEDA, Usuario } from '../../../../nucleo/modelos';
import { Avatar, Esqueleto, Icono, Tarjeta } from '../../../../compartido';
import { formatearMonto } from '../../../../nucleo/utilidades/formato.util';

@Component({
  selector: 'app-transferencia-rapida',
  imports: [Tarjeta, Avatar, Icono, Esqueleto, FormsModule],
  templateUrl: './transferencia-rapida.html',
  styleUrl: './transferencia-rapida.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaRapida implements OnInit {
  private readonly contactosServicio = inject(ContactosServicio);
  private readonly tasasServicio = inject(TasasCambioServicio);
  private readonly transferenciasServicio = inject(TransferenciasServicio);
  private readonly transaccionesServicio = inject(TransaccionesServicio);
  private readonly usuariosServicio = inject(UsuariosServicio);
  private readonly avisos = inject(AvisosServicio);

  readonly contactos = this.contactosServicio.contactos;
  readonly estadoContactos = this.contactosServicio.estado;
  readonly usuario = this.usuariosServicio.usuario;
  readonly enviando = this.transferenciasServicio.enviando;

  readonly monedas: readonly CodigoMoneda[] = ['EUR', 'USD', 'GBP', 'PEN'];

  readonly contactoSeleccionadoId = signal<string | null>(null);
  readonly montoOrigen = signal<number>(275);
  readonly monedaOrigen = signal<CodigoMoneda>('EUR');
  readonly monedaDestino = signal<CodigoMoneda>('USD');

  readonly modalContactoAbierto = signal(false);
  readonly cargandoUsuariosRegistrados = signal(false);
  readonly guardandoContacto = signal(false);
  readonly usuariosRegistrados = signal<Usuario[]>([]);
  readonly tabModal = signal<'registrados' | 'manual'>('registrados');

  readonly nuevoNombre = signal('');
  readonly nuevoCorreo = signal('');
  readonly nuevaMoneda = signal<CodigoMoneda>('USD');
  readonly nuevoFavorito = signal(true);
  readonly errorModal = signal<string | null>(null);

  readonly progreso = signal(0);

  readonly mostrarTodos = signal(false);

  private arrastrando = false;

  private haArrastrado = false;

  private readonly CONTACTOS_VISIBLES = 4;

  readonly contactosVisibles = computed(() =>
    this.mostrarTodos() ? this.contactos() : this.contactos().slice(0, this.CONTACTOS_VISIBLES),
  );

  readonly textoVerTodos = computed(() => (this.mostrarTodos() ? 'Ver menos' : 'Ver todos'));

  readonly hayMasContactos = computed(() => this.contactos().length > this.CONTACTOS_VISIBLES);

  readonly contactoSeleccionado = computed(() => {
    const id = this.contactoSeleccionadoId();
    return id ? (this.contactos().find((c) => c.id === id) ?? null) : null;
  });

  readonly tasa = computed(() =>
    this.tasasServicio.obtenerTasa(this.monedaOrigen(), this.monedaDestino()),
  );

  readonly montoDestino = computed(() =>
    this.tasasServicio.convertir(this.montoOrigen(), this.monedaOrigen(), this.monedaDestino()),
  );

  readonly textoTasa = computed(() => {
    const simboloOrigen = SIMBOLOS_MONEDA[this.monedaOrigen()];
    const simboloDestino = SIMBOLOS_MONEDA[this.monedaDestino()];
    return `1 ${simboloOrigen} = ${this.tasa().toFixed(2)} ${simboloDestino}`;
  });

  readonly puedeEnviar = computed(
    () => Boolean(this.contactoSeleccionado()) && this.montoOrigen() > 0 && !this.enviando(),
  );

  constructor() {
    effect(() => {
      const contacto = this.contactoSeleccionado();
      if (contacto) {
        this.monedaDestino.set(contacto.moneda_preferida);
      }
    });
  }

  ngOnInit(): void {
    void Promise.all([this.contactosServicio.cargar(), this.tasasServicio.cargar()]).then(() => {
      const primero = this.contactos()[0];
      if (primero && !this.contactoSeleccionadoId()) {
        this.contactoSeleccionadoId.set(primero.id);
      }
    });
  }

  seleccionarContacto(id: string): void {
    this.contactoSeleccionadoId.set(id);
  }

  verTodos(): void {
    this.mostrarTodos.update((valor) => !valor);
  }

  cambiarMonto(evento: Event): void {
    const valor = Number.parseFloat((evento.target as HTMLInputElement).value);
    this.montoOrigen.set(Number.isFinite(valor) ? valor : 0);
  }

  cambiarMonedaOrigen(evento: Event): void {
    this.monedaOrigen.set((evento.target as HTMLSelectElement).value as CodigoMoneda);
  }

  cambiarMonedaDestino(evento: Event): void {
    this.monedaDestino.set((evento.target as HTMLSelectElement).value as CodigoMoneda);
  }

  intercambiarMonedas(): void {
    const origen = this.monedaOrigen();
    this.monedaOrigen.set(this.monedaDestino());
    this.monedaDestino.set(origen);
  }

  montoDestinoFormateado(): string {
    return formatearMonto(this.montoDestino(), this.monedaDestino());
  }

  iniciarArrastre(evento: PointerEvent): void {
    if (!this.puedeEnviar()) {
      return;
    }

    this.arrastrando = true;
    this.haArrastrado = false;
    (evento.target as HTMLElement).setPointerCapture(evento.pointerId);
  }

  moverArrastre(evento: PointerEvent, pista: HTMLElement): void {
    if (!this.arrastrando) {
      return;
    }

    this.haArrastrado = true;

    const limites = pista.getBoundingClientRect();
    const recorrido = limites.width - 56;
    const desplazamiento = evento.clientX - limites.left - 28;

    const valor = Math.min(1, Math.max(0, desplazamiento / recorrido));
    this.progreso.set(valor);
  }

  async soltarArrastre(): Promise<void> {
    if (!this.arrastrando) {
      return;
    }

    this.arrastrando = false;

    if (this.progreso() >= 0.85) {
      await this.enviar();
    }

    this.progreso.set(0);
  }

  async alHacerClic(): Promise<void> {
    if (this.haArrastrado) {
      this.haArrastrado = false;
      return;
    }

    await this.enviar();
  }

  async enviar(): Promise<void> {
    if (this.enviando()) {
      return;
    }

    const contacto = this.contactoSeleccionado();

    if (!contacto || this.montoOrigen() <= 0) {
      this.avisos.error('Elige un destinatario y un importe válido.');
      return;
    }

    try {
      await this.transferenciasServicio.enviar({
        contactoId: contacto.id,
        monto: this.montoOrigen(),
        monedaOrigen: this.monedaOrigen(),
        monedaDestino: this.monedaDestino(),
      });

      this.avisos.exito(
        `Transferencia de ${formatearMonto(this.montoOrigen(), this.monedaOrigen())} enviada a ${contacto.nombre}.`,
      );

      await Promise.all([
        this.transaccionesServicio.cargar(),
        this.transaccionesServicio.cargarVolumen(),
        this.usuariosServicio.refrescarResumen(),
      ]);
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo enviar.');
    }
  }

  async abrirModalContacto(): Promise<void> {
    this.modalContactoAbierto.set(true);
    this.nuevoNombre.set('');
    this.nuevoCorreo.set('');
    this.nuevaMoneda.set('USD');
    this.nuevoFavorito.set(true);
    this.errorModal.set(null);
    this.cargandoUsuariosRegistrados.set(true);

    try {
      const usuarios = await this.contactosServicio.obtenerUsuariosRegistrados();
      this.usuariosRegistrados.set(usuarios);
      if (usuarios.length === 0) {
        this.tabModal.set('manual');
      } else {
        this.tabModal.set('registrados');
      }
    } finally {
      this.cargandoUsuariosRegistrados.set(false);
    }
  }

  cerrarModalContacto(): void {
    this.modalContactoAbierto.set(false);
    this.errorModal.set(null);
  }

  async agregarUsuarioDirecto(usuario: Usuario): Promise<void> {
    this.guardandoContacto.set(true);
    this.errorModal.set(null);

    try {
      const creado = await this.contactosServicio.crear({
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        color_avatar: usuario.color_avatar,
        moneda_preferida: usuario.moneda_base,
        favorito: true,
      });

      this.contactoSeleccionadoId.set(creado.id);
      this.avisos.exito(`Destinatario ${creado.nombre} agregado.`);
      this.cerrarModalContacto();
    } catch (error) {
      this.errorModal.set(error instanceof Error ? error.message : 'No se pudo agregar el usuario.');
    } finally {
      this.guardandoContacto.set(false);
    }
  }

  async guardarContactoManual(): Promise<void> {
    const nombre = this.nuevoNombre().trim();
    if (!nombre) {
      this.errorModal.set('El nombre del destinatario es obligatorio.');
      return;
    }

    this.guardandoContacto.set(true);
    this.errorModal.set(null);

    try {
      const creado = await this.contactosServicio.crear({
        nombre,
        correo: this.nuevoCorreo() || undefined,
        moneda_preferida: this.nuevaMoneda(),
        favorito: this.nuevoFavorito(),
      });

      this.contactoSeleccionadoId.set(creado.id);
      this.avisos.exito(`Destinatario ${creado.nombre} agregado.`);
      this.cerrarModalContacto();
    } catch (error) {
      this.errorModal.set(error instanceof Error ? error.message : 'No se pudo guardar el contacto.');
    } finally {
      this.guardandoContacto.set(false);
    }
  }
}

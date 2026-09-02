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

/**
 * WIDGET DE TRANSFERENCIA RÁPIDA
 * -----------------------------------------------------------------------------
 * Reproduce la tarjeta «Quick transfer» del diseño:
 *   - fila de contactos favoritos,
 *   - importe de origen con su moneda,
 *   - tasa de cambio y conversión en vivo,
 *   - importe que recibirá el destinatario,
 *   - control deslizante «Arrastra para enviar».
 *
 * El deslizante es intencionado: enviar dinero es irreversible, así que se pide
 * un gesto deliberado en lugar de un clic que se pueda dar sin querer. Aun así
 * el control es un `<button>` real, de modo que con el teclado se activa con
 * Intro o Espacio (accesibilidad).
 */
@Component({
  selector: 'app-transferencia-rapida',
  imports: [Tarjeta, Avatar, Icono, Esqueleto, FormsModule],
  templateUrl: './transferencia-rapida.html',
  styleUrl: './transferencia-rapida.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaRapida implements OnInit {
  // --- Servicios -------------------------------------------------------------
  private readonly contactosServicio = inject(ContactosServicio);
  private readonly tasasServicio = inject(TasasCambioServicio);
  private readonly transferenciasServicio = inject(TransferenciasServicio);
  private readonly transaccionesServicio = inject(TransaccionesServicio);
  private readonly usuariosServicio = inject(UsuariosServicio);
  private readonly avisos = inject(AvisosServicio);

  // --- Datos de solo lectura -------------------------------------------------
  readonly contactos = this.contactosServicio.contactos;
  readonly estadoContactos = this.contactosServicio.estado;
  readonly usuario = this.usuariosServicio.usuario;
  readonly enviando = this.transferenciasServicio.enviando;

  /** Monedas que se ofrecen en los desplegables. */
  readonly monedas: readonly CodigoMoneda[] = ['EUR', 'USD', 'GBP', 'PEN'];

  // --- Estado del formulario -------------------------------------------------
  readonly contactoSeleccionadoId = signal<string | null>(null);
  readonly montoOrigen = signal<number>(275);
  readonly monedaOrigen = signal<CodigoMoneda>('EUR');
  readonly monedaDestino = signal<CodigoMoneda>('USD');

  // --- Modal de Nuevo Destinatario -------------------------------------------
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

  /** Posición del deslizante, de 0 (izquierda) a 1 (final). */
  readonly progreso = signal(0);

  /** Si es false solo se muestran los primeros contactos. */
  readonly mostrarTodos = signal(false);

  /** true mientras el usuario mantiene pulsado el deslizante. */
  private arrastrando = false;

  /** true si el usuario ha desplazado el tirador durante la interacción. */
  private haArrastrado = false;

  /** Cuántos contactos caben en la fila sin desplegar. */
  private readonly CONTACTOS_VISIBLES = 4;

  // --- Valores derivados -----------------------------------------------------

  /** Contactos que se pintan ahora mismo (todos o solo los primeros). */
  readonly contactosVisibles = computed(() =>
    this.mostrarTodos() ? this.contactos() : this.contactos().slice(0, this.CONTACTOS_VISIBLES),
  );

  /** Texto del botón de la cabecera, según el estado del desplegado. */
  readonly textoVerTodos = computed(() => (this.mostrarTodos() ? 'Ver menos' : 'Ver todos'));

  /** El botón solo tiene sentido si hay más contactos de los que se ven. */
  readonly hayMasContactos = computed(() => this.contactos().length > this.CONTACTOS_VISIBLES);

  /** Contacto elegido (objeto completo, no solo el id). */
  readonly contactoSeleccionado = computed(() => {
    const id = this.contactoSeleccionadoId();
    return id ? (this.contactos().find((c) => c.id === id) ?? null) : null;
  });

  /** Tasa vigente entre las dos monedas elegidas. */
  readonly tasa = computed(() =>
    this.tasasServicio.obtenerTasa(this.monedaOrigen(), this.monedaDestino()),
  );

  /** Importe que recibirá el destinatario. Se recalcula al teclear. */
  readonly montoDestino = computed(() =>
    this.tasasServicio.convertir(this.montoOrigen(), this.monedaOrigen(), this.monedaDestino()),
  );

  /** Texto de la tasa: «1 € = 1.18 $». */
  readonly textoTasa = computed(() => {
    const simboloOrigen = SIMBOLOS_MONEDA[this.monedaOrigen()];
    const simboloDestino = SIMBOLOS_MONEDA[this.monedaDestino()];
    return `1 ${simboloOrigen} = ${this.tasa().toFixed(2)} ${simboloDestino}`;
  });

  /** El formulario solo es válido con destinatario e importe positivo. */
  readonly puedeEnviar = computed(
    () => Boolean(this.contactoSeleccionado()) && this.montoOrigen() > 0 && !this.enviando(),
  );

  constructor() {
    /**
     * `effect` reacciona a los cambios de las señales que lee.
     * Aquí: cuando se elige un contacto, la moneda de destino pasa a ser la
     * que ese contacto tiene configurada como preferida.
     */
    effect(() => {
      const contacto = this.contactoSeleccionado();
      if (contacto) {
        this.monedaDestino.set(contacto.moneda_preferida);
      }
    });
  }

  ngOnInit(): void {
    // Cargamos contactos y tasas en paralelo y preseleccionamos el primero.
    void Promise.all([this.contactosServicio.cargar(), this.tasasServicio.cargar()]).then(() => {
      const primero = this.contactos()[0];
      if (primero && !this.contactoSeleccionadoId()) {
        this.contactoSeleccionadoId.set(primero.id);
      }
    });
  }

  // ==========================================================================
  // FORMULARIO
  // ==========================================================================

  /** Selecciona un contacto al pulsar su avatar. */
  seleccionarContacto(id: string): void {
    this.contactoSeleccionadoId.set(id);
  }

  /** Despliega o repliega la lista completa de contactos. */
  verTodos(): void {
    this.mostrarTodos.update((valor) => !valor);
  }

  /** Actualiza el importe a partir de lo que se escribe en el campo. */
  cambiarMonto(evento: Event): void {
    const valor = Number.parseFloat((evento.target as HTMLInputElement).value);
    this.montoOrigen.set(Number.isFinite(valor) ? valor : 0);
  }

  /** Cambia la moneda de origen. */
  cambiarMonedaOrigen(evento: Event): void {
    this.monedaOrigen.set((evento.target as HTMLSelectElement).value as CodigoMoneda);
  }

  /** Cambia la moneda de destino. */
  cambiarMonedaDestino(evento: Event): void {
    this.monedaDestino.set((evento.target as HTMLSelectElement).value as CodigoMoneda);
  }

  /** Intercambia las dos monedas (botón de las flechas). */
  intercambiarMonedas(): void {
    const origen = this.monedaOrigen();
    this.monedaOrigen.set(this.monedaDestino());
    this.monedaDestino.set(origen);
  }

  /** Formatea el importe de destino para mostrarlo. */
  montoDestinoFormateado(): string {
    return formatearMonto(this.montoDestino(), this.monedaDestino());
  }

  // ==========================================================================
  // DESLIZANTE «ARRASTRA PARA ENVIAR»
  // Se usan eventos de puntero (pointer*) en vez de mouse/touch por separado:
  // funcionan igual con ratón, dedo o lápiz.
  // ==========================================================================

  /** Empieza el arrastre. */
  iniciarArrastre(evento: PointerEvent): void {
    if (!this.puedeEnviar()) {
      return;
    }

    this.arrastrando = true;
    this.haArrastrado = false;
    // Capturamos el puntero: seguimos recibiendo eventos aunque el dedo salga
    // del botón.
    (evento.target as HTMLElement).setPointerCapture(evento.pointerId);
  }

  /** Mueve el tirador mientras se arrastra. */
  moverArrastre(evento: PointerEvent, pista: HTMLElement): void {
    if (!this.arrastrando) {
      return;
    }

    this.haArrastrado = true;

    // 56 = ancho del tirador (48) + su margen a cada lado (4 + 4).
    const limites = pista.getBoundingClientRect();
    const recorrido = limites.width - 56;
    const desplazamiento = evento.clientX - limites.left - 28;

    // Limitamos el valor al rango 0..1.
    const valor = Math.min(1, Math.max(0, desplazamiento / recorrido));
    this.progreso.set(valor);
  }

  /**
   * Suelta el tirador: si ha llegado suficientemente lejos (>= 85 %) se envía;
   * si no, vuelve al inicio.
   */
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

  /**
   * Maneja el clic en el botón (por ejemplo, accesibilidad con Intro o Espacio).
   * Si el usuario acaba de realizar un arrastre, ignora el clic sintético residual.
   */
  async alHacerClic(): Promise<void> {
    if (this.haArrastrado) {
      this.haArrastrado = false;
      return;
    }

    await this.enviar();
  }

  /**
   * Envía la transferencia.
   * También se usa desde el teclado (Intro/Espacio sobre el botón).
   */
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

      // El envío crea una transacción: refrescamos historial, gráfico y totales.
      await Promise.all([
        this.transaccionesServicio.cargar(),
        this.transaccionesServicio.cargarVolumen(),
        this.usuariosServicio.refrescarResumen(),
      ]);
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo enviar.');
    }
  }

  // ==========================================================================
  // GESTIÓN DE NUEVOS DESTINATARIOS
  // ==========================================================================

  /** Abre el modal para agregar destinatarios. */
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

  /** Cierra el modal. */
  cerrarModalContacto(): void {
    this.modalContactoAbierto.set(false);
    this.errorModal.set(null);
  }

  /** Agrega a un usuario registrado de Payline como destinatario. */
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

  /** Guarda un contacto ingresado manualmente en el formulario. */
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

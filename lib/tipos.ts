export type Rol = "Administrador" | "Administracion" | "Tecnico" | "Cliente";
export type Recurso = "equipos" | "mantenimientos" | "tickets" | "gestionTickets" | "contratos" | "clientes" | "finanzas" | "usuarios" | "alertas" | "resumen" | "indicadores" | "portal";
export type Permisos = Record<Recurso, { leer: boolean; escribir: boolean }>;

export interface Me { correo: string; nombre: string; rol: Rol | null; estado: string; permisos: Permisos; clienteId?: string }

export type EstadoEquipo = "Disponible" | "Alquilado" | "En mantenimiento" | "Reservado";
export interface CambioEquipo { fecha: string; usuario: string; accion: string; cambios: Record<string, { antes: unknown; despues: unknown }> }
export type Condicion = "Nuevo" | "Como nuevo" | "Reacondicionado" | "Usado en buen estado";
export type TipoEquipo = "Laptop" | "Impresora" | "Monitor" | "Servidor" | "Red";
export interface Equipo {
  equipoId: string; nombre: string; tipo: TipoEquipo; serie: string; estado: EstadoEquipo;
  contratoId?: string; garantiaHasta: string; tarifaMensual: number; incidenciasAbiertas?: number;
  marca?: string; modelo?: string; condicion?: Condicion; caracteristicas?: string; descripcion?: string; garantiaMeses?: number; imagenUrl?: string;
  sede?: string; reservaVence?: string; historial?: CambioEquipo[];
}
export interface Mantenimiento {
  equipoId: string; mantenimientoId: string; fecha: string; tipo: "Preventivo" | "Correctivo"; detalle: string;
  estado: "Programado" | "En curso" | "Completado"; tecnico: string; ticketId?: string;
}
export interface EquipoDetalle extends Equipo {
  contrato: Contrato | null; mantenimientos: Mantenimiento[]; tickets: Ticket[]; incidenciasAbiertas: number;
}

export type EstadoTicket = "Abierto" | "En atención" | "Resuelto";
export type Prioridad = "Alta" | "Media" | "Baja";
export type Categoria = "Hardware" | "Software" | "Impresión" | "Red" | "General";
export interface Evidencia { nombre: string; tipo: string; clave?: string; bytes?: number }
export interface Ticket {
  ticketId: string; titulo: string; descripcion: string; categoria: Categoria; prioridad: Prioridad; estado: EstadoTicket;
  creado: string; creadoEn?: string; equipoId?: string; creadoPor: string; asignadoA?: string; origen: "IA" | "Manual" | "Prueba"; resueltoEn?: string;
  equipoNombre?: string | null; sede?: string;
  /** CU-11/12: prioridad sugerida (IA o reglas), su motivo y si una persona ya la confirmó. */
  prioridadSugerida?: Prioridad; motivoPrioridad?: string; origenPrioridad?: "bedrock" | "reglas"; prioridadConfirmada?: boolean; confirmadaPor?: string;
  evidencia?: Evidencia;
}
export interface Comentario {
  ticketId: string; creadoEn: string; tipo: "Comentario" | "CambioEstado" | "Prioridad" | "Asignacion" | "Aviso" | "AvisoFallido"; autor: string; texto: string;
  estadoAnterior?: string; estadoNuevo?: string;
}
/** Archivo de evidencia para enviar a la API (CU-10). */
export interface EvidenciaNueva { nombre: string; tipo: string; base64: string }
export interface TicketDetalle extends Ticket { equipo: Equipo | null; comentarios: Comentario[] }

export interface Cliente {
  clienteId: string; razonSocial: string; ruc: string; contacto: string; correo: string; telefono: string;
  direccion: string; estado: "Activo" | "Inactivo"; creadoEn: string;
}
export interface Contrato {
  contratoId: string; clienteId: string; nombre: string; inicio: string; fin: string; equiposContratados: number;
  estado: "Vigente" | "Renovado" | "Cancelado" | "Pendiente de pago"; equiposEnUso?: number; tarifaMensual?: number; diasParaVencer?: number;
  /** Pedidos del portal: hasta cuándo dura la reserva sin pagar y por qué se canceló. */
  reservaVence?: string; motivoCancelacion?: string; montoMensual?: number; equipoIds?: string[];
}
export interface ContratoDetalle extends Contrato {
  cliente: Cliente | null; equipos: Equipo[]; equiposEnUso: number; tarifaMensual: number; diasParaVencer: number; facturas?: Factura[];
}
export interface Factura {
  facturaId: string; contratoId: string; emitida: string; vence: string; monto: number; estado: "Pendiente" | "Pagada";
  pagadaEl?: string; estadoCalculado?: "Pendiente" | "Pagada" | "Vencida";
}
export interface Proveedor { proveedorId: string; razonSocial: string; ruc: string; contacto: string; correo: string; telefono: string; estado: "Activo" | "Inactivo" }
export interface OrdenCompra {
  ordenId: string; proveedorId: string; fecha: string; descripcion: string; monto: number;
  estado: "En aprobación" | "En tránsito" | "Entregada"; proveedor?: string | null;
}
export interface Usuario { correo: string; nombre: string; rol: Rol | "Sin asignar"; estado: "Activo" | "Inactivo" | "Pendiente"; creadoEn: string; ultimoAcceso?: string; clienteId?: string }
export interface Alerta {
  alertaId: string; tipo: "FacturaVencida" | "ContratoPorVencer" | "ContratoSaturado" | "GarantiaPorVencer"; severidad: "Alta" | "Media" | "Baja";
  entidad: "FACTURA" | "CONTRATO" | "EQUIPO"; entidadId: string; mensaje: string; estado: "Nueva" | "Vista" | "Resuelta"; creadaEn: string;
}
export interface Resumen {
  equipos: { total: number; disponible: number; alquilado: number; enMantenimiento: number; reservado?: number; conIncidencia: number };
  tickets: { abiertos: number; enAtencion: number; resueltos: number; recientes: Ticket[] };
  /** Solo llega a los roles que pueden ver contratos (no al técnico). */
  contratos?: { vigentes: number; porVencer: { contratoId: string; nombre: string; fin: string; dias: number }[] };
  alertasNuevas: number;
  finanzas?: { pendienteMonto: number; pendienteCantidad: number; vencidasMonto: number; vencidasCantidad: number; inversionMensual: { mes: string; total: number }[] };
}
export interface Interpretacion {
  solicitudId: string; titulo: string; categoria: Categoria; prioridad: Prioridad; equipoId: string | null; resumen: string;
  metodo: "bedrock" | "reglas"; aviso?: string;
}

// ---------- portal del cliente ----------
export interface FichaEquipo {
  equipoId: string; nombre: string; tipo: TipoEquipo; marca: string | null; modelo: string | null; condicion: Condicion | null;
  caracteristicas: string; descripcion: string; garantiaMeses: number; tarifaMensual: number; imagenUrl: string | null;
}
export interface Garantia { meses: number; desde: string; hasta: string; vigente: boolean }
export interface EquipoCliente extends FichaEquipo {
  serie: string; estado: EstadoEquipo; contratoId: string; contratoFin: string; garantia: Garantia; incidenciasAbiertas: number;
  mantenimientos: { fecha: string; tipo: string; estado: string }[];
}
export type MetodoPago = "tarjeta" | "yape" | "plin";
export type DatosPago =
  | { metodo: "tarjeta"; numero: string; vence: string; cvv: string; titular: string }
  | { metodo: "yape" | "plin"; celular: string; codigo: string };
export interface Perfil { correo: string; nombre: string; cliente: Cliente | null }
export interface ContratoCliente extends Contrato { equiposEnUso: number; tarifaMensual: number; diasParaVencer: number; meses?: number; origen?: string }
export interface ResumenFactura {
  facturaId: string; tipoComprobante: "Boleta" | "Factura"; emitida: string; vence: string; monto: number; estado: "Pendiente" | "Pagada"; estadoCalculado: "Pendiente" | "Pagada" | "Vencida";
}
export interface DatosClienteContrato { razonSocial: string; ruc: string; direccion?: string; telefono?: string; correo?: string }
export interface ContratoClienteDetalle extends ContratoCliente {
  equipos: EquipoCliente[]; facturas: ResumenFactura[];
  /** Datos del cliente para el documento del contrato (los backends anteriores no los envían). */
  cliente?: DatosClienteContrato;
}
export interface FacturaCliente extends ResumenFactura { contratoId: string; pagadaEl: string | null; metodoPago: MetodoPago | null }
export interface Comprobante extends ResumenFactura {
  contratoId: string; concepto: string; subtotal: number; igv: number; pagadaEl?: string; metodoPago?: MetodoPago; referenciaPago?: string; detallePago?: string;
  receptor: { nombre: string; documento: string; direccion: string }; emisor: { nombre: string; nota: string };
  items: { equipoId: string; descripcion: string; precio: number }[];
}
export interface ResultadoPedido {
  contrato: { contratoId: string; nombre: string; inicio: string; fin: string; meses: number; equiposContratados: number };
  comprobante: Comprobante; pago: { metodo: MetodoPago; referencia: string; detalle: string };
  /** Correo al que se envió el comprobante; null si no se pudo enviar. */
  correoEnviadoA?: string | null;
}
export interface TicketCliente {
  ticketId: string; titulo: string; estado: EstadoTicket; prioridad: Prioridad; categoria: Categoria; creado: string; equipoId: string | null; equipoNombre: string | null;
}
export interface TicketClienteDetalle extends TicketCliente {
  descripcion: string; sede?: string | null; evidencia?: { nombre: string; tipo: string } | null; comentarios: { creadoEn: string; autor: string; texto: string }[];
}
/** Respuesta al registrar un ticket desde el portal: resumen de lo detectado (CU-10). */
export interface TicketRegistrado extends TicketCliente { sede: string | null; evidencia: { nombre: string } | null; avisos: string[] }
/** Pedido del portal que espera el pago (CU-04). */
export interface PedidoPendiente { contratoId: string; estado: "Pendiente de pago"; reservaVence: string; montoMensual: number }

// ---------- indicadores y demanda (CU-15, CU-16) ----------
export interface Indicador { valor: number | null; muestra: number; unidad: string; nota?: string }
export interface Indicadores {
  tiempoRespuesta: Indicador; cierreEnPlazo: Indicador; trazabilidad: Indicador; concordancia: Indicador; costoPorEquipo: Indicador;
  ticketsConsiderados: number; ticketsDePrueba: number; inversionMensual: { mes: string; total: number }[];
  configuracion: { slaHoras: Record<Prioridad, number>; minimo: number }; calculadoEl: string;
}
export interface Demanda { historial: { mes: string; equipos: number }[]; estimacion: { mes: string; equipos: number; metodo: string } | null; nota: string | null }
export interface RespuestaAsistente { respuesta: string; metodo: "bedrock" | "reglas"; aviso?: string }
/** Respuestas de las funciones de IA: siempre dicen si vinieron del modelo o de las reglas de respaldo. */
export interface OrigenIA { metodo: "bedrock" | "reglas"; aviso?: string }
export interface TextoIA extends OrigenIA { texto: string }
export interface PasosIA extends OrigenIA { pasos: string[]; categoria?: string }
export interface RecomendacionesIA extends OrigenIA { resumen: string; recomendaciones: (FichaEquipo & { motivo: string })[] }

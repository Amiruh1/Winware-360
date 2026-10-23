"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Grid3x3, LayoutGrid, List, ShoppingCart, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import { RecomendadorIA } from "@/components/FuncionesIA";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import EquipoIcono from "@/components/EquipoIcono";
import EquipoImagen from "@/components/EquipoImagen";
import FichaVista, { tonoCondicion } from "@/components/FichaVista";
import AsistenteIA from "@/components/AsistenteIA";
import PagoForm from "@/components/PagoForm";
import PerfilCliente from "@/components/PerfilCliente";
import ComprobanteVista from "@/components/ComprobanteVista";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { fechaCorta, pen, plural } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import type { DatosPago, FichaEquipo, PedidoPendiente, ResultadoPedido, TipoEquipo } from "@/lib/tipos";

const TIPOS: TipoEquipo[] = ["Laptop", "Impresora", "Monitor", "Servidor", "Red"];

type Vista = "grande" | "compacta" | "lista";
const VISTAS: { id: Vista; nombre: string; Icono: typeof LayoutGrid }[] = [
  { id: "grande", nombre: "Cuadrícula", Icono: LayoutGrid },
  { id: "compacta", nombre: "Cuadrícula compacta", Icono: Grid3x3 },
  { id: "lista", nombre: "Lista", Icono: List },
];
type Orden = "relevancia" | "precio-asc" | "precio-desc" | "nombre";
const ORDENES: { id: Orden; nombre: string }[] = [
  { id: "relevancia", nombre: "Relevancia" },
  { id: "precio-asc", nombre: "Precio: menor a mayor" },
  { id: "precio-desc", nombre: "Precio: mayor a menor" },
  { id: "nombre", nombre: "Nombre: A a Z" },
];
/** Hora local (HH:MM) de un instante ISO. */
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

function ordenar(lista: FichaEquipo[], orden: Orden): FichaEquipo[] {
  if (orden === "relevancia") return lista;
  const copia = [...lista];
  if (orden === "nombre") return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return copia.sort((a, b) => (orden === "precio-asc" ? a.tarifaMensual - b.tarifaMensual : b.tarifaMensual - a.tarifaMensual));
}

export default function Catalogo() {
  const { puede, me } = useAuth();
  const aviso = useToast();
  const [tipo, setTipo] = useState<"" | TipoEquipo>("");
  const lista = useCarga(() => api<{ items: FichaEquipo[] }>("/catalogo"), []);
  const [carrito, setCarrito] = useState<string[]>([]);
  const [detalle, setDetalle] = useState<FichaEquipo | null>(null);
  const [paso, setPaso] = useState<null | "pedido" | "perfil" | "listo">(null);
  const [meses, setMeses] = useState("12");
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);
  const [filtros, setFiltros] = useState(false);
  const [vista, setVista] = useState<Vista>("grande");
  const [orden, setOrden] = useState<Orden>("relevancia");
  const [asesor, setAsesor] = useState(false);
  const [pendiente, setPendiente] = useState<{ pedido: PedidoPendiente; equipos: FichaEquipo[] } | null>(null);

  const clave = me ? `winware360.carrito.${me.correo}` : null;
  useEffect(() => { // el carrito sobrevive a recargar la página
    if (!clave) return;
    try { const g = JSON.parse(localStorage.getItem(clave) ?? "[]"); if (Array.isArray(g)) setCarrito(g.filter((x) => typeof x === "string")); } catch { /* sin almacenamiento */ }
  }, [clave]);
  useEffect(() => { if (clave) try { localStorage.setItem(clave, JSON.stringify(carrito)); } catch { /* sin almacenamiento */ } }, [clave, carrito]);

  const items = lista.datos?.items ?? [];
  // se descartan del carrito los equipos que ya no están disponibles
  const enCarrito = useMemo(() => items.filter((e) => carrito.includes(e.equipoId)), [items, carrito]);
  const visibles = ordenar(items.filter((e) => !tipo || e.tipo === tipo), orden);
  const mensual = enCarrito.reduce((s, e) => s + e.tarifaMensual, 0);

  if (!puede("portal")) return <SinAcceso />;

  const alternar = (id: string) => setCarrito((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 10 ? (aviso("Puedes alquilar hasta 10 equipos por pedido.", "error"), c) : [...c, id]));
  const abrirPedido = () => setPaso(me?.clienteId ? "pedido" : "perfil");

  // CU-04/05: el pedido reserva los equipos; si el pago se rechaza, queda pendiente y se reintenta sobre la misma reserva.
  async function pagar(pago: DatosPago) {
    try {
      const r = pendiente
        ? await api<ResultadoPedido>(`/portal/pedidos/${pendiente.pedido.contratoId}/pagar`, { metodo: "POST", cuerpo: { pago } })
        : await api<ResultadoPedido>("/portal/pedidos", { metodo: "POST", cuerpo: { equipoIds: enCarrito.map((e) => e.equipoId), meses: Number(meses), pago } });
      setResultado(r); setCarrito([]); setPendiente(null); setPaso("listo");
      await lista.recargar();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.datos?.pedido) setPendiente({ pedido: e.datos.pedido, equipos: pendiente?.equipos ?? enCarrito });
        if (e.status === 410) {                                   // la reserva venció: se vuelve a empezar
          setPendiente(null); setCarrito([]); setPaso(null); await lista.recargar();
          aviso(e.message, "error"); return;
        }
        if (e.datos?.codigo === "NO_DISPONIBLE") {
          const alt = (e.datos.alternativas ?? []).map((a: { nombre: string }) => a.nombre).join(", ");
          await lista.recargar();
          throw new Error(`${e.message}.${alt ? ` Alternativas disponibles: ${alt}.` : ""}`);
        }
      }
      throw e;
    }
  }
  const cerrarPedido = () => {
    if (pendiente) {                                              // la reserva sigue: se paga desde Mis contratos
      aviso(`Tus equipos quedan reservados hasta las ${hora(pendiente.pedido.reservaVence)}. Puedes completar el pago desde Mis contratos.`);
      setPendiente(null); setCarrito([]); void lista.recargar();
    }
    setPaso(null);
  };
  const lineas = pendiente?.equipos ?? enCarrito;
  const totalMes = pendiente?.pedido.montoMensual ?? mensual;

  return (
    <>
      <PageHeader titulo="Catálogo de equipos" descripcion="Equipos disponibles para alquilar. Elige los que necesitas, paga en línea y recibe tu comprobante al instante." />
      <div className="catalogo-barra">
        <button type="button" className="catalogo-filtrar" aria-expanded={filtros} aria-controls="catalogo-filtros" onClick={() => setFiltros((f) => !f)}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Filtrar{tipo && <b className="catalogo-filtro-activo">1</b>}
        </button>
        <span className="catalogo-total">{plural(visibles.length, "producto", "productos")}</span>
        <button type="button" className="catalogo-filtrar catalogo-asesor" onClick={() => setAsesor(true)}><Sparkles size={16} aria-hidden="true" /> Te ayudo a elegir</button>
        <div className="catalogo-vistas" role="group" aria-label="Vista">
          {VISTAS.map(({ id, nombre, Icono }) => (
            <button key={id} type="button" aria-pressed={vista === id} aria-label={nombre} title={nombre} onClick={() => setVista(id)}><Icono size={18} aria-hidden="true" /></button>
          ))}
        </div>
        <label className="catalogo-orden">
          <span>Ordenar por:</span>
          <select value={orden} onChange={(ev) => setOrden(ev.target.value as Orden)}>
            {ORDENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </label>
      </div>
      {filtros && (
        <div id="catalogo-filtros" className="tabs catalogo-filtros" role="group" aria-label="Filtrar por tipo">
          <button type="button" aria-pressed={tipo === ""} onClick={() => setTipo("")}>Todos <b>{items.length}</b></button>
          {TIPOS.map((t) => <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}><EquipoIcono tipo={t} size={15} /> {t} <b>{items.filter((e) => e.tipo === t).length}</b></button>)}
        </div>
      )}

      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && visibles.length === 0 && <Vacio>No hay equipos disponibles de este tipo por ahora.</Vacio>}
      <ul className={`catalogo vista-${vista}`}>
        {visibles.map((e) => {
          const dentro = carrito.includes(e.equipoId);
          return (
            <li key={e.equipoId} className="producto">
              <button type="button" className="producto-media" onClick={() => setDetalle(e)} aria-label={`Ver detalle de ${e.nombre}`}>
                <span className="producto-marcas">
                  <span className="producto-marca">{e.marca || e.tipo}</span>
                  {e.condicion && <Badge tono={tonoCondicion(e.condicion)}>{e.condicion}</Badge>}
                </span>
                <EquipoImagen tipo={e.tipo} nombre={e.nombre} url={e.imagenUrl} />
                <span className="producto-franja" aria-hidden="true" />
              </button>
              <h2 className="producto-nombre"><button type="button" onClick={() => setDetalle(e)}>{e.nombre}{e.modelo ? `, ${e.modelo}` : ""}</button></h2>
              <div className="producto-pie">
                <dl className="producto-datos">
                  <div><dt>Disponible:</dt><dd>Sí</dd></div>
                  <div><dt>Referencia:</dt><dd>{e.equipoId}</dd></div>
                  <div><dt>Garantía:</dt><dd>{e.garantiaMeses} meses</dd></div>
                </dl>
                <p className="precio">{pen(e.tarifaMensual)} <span>/ mes</span></p>
                <div className="producto-acc">
                  <button type="button" className="btn btn-sm" aria-pressed={dentro} onClick={() => alternar(e.equipoId)}>{dentro ? <><Check size={15} aria-hidden="true" /> En tu pedido</> : <><ShoppingCart size={15} aria-hidden="true" /> Agregar</>}</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {enCarrito.length > 0 && !paso && (
        <div className="barra-carrito" role="region" aria-label="Tu pedido">
          <span><ShoppingCart size={18} aria-hidden="true" /> <b>{enCarrito.length}</b> {enCarrito.length === 1 ? "equipo" : "equipos"} · {pen(mensual)} al mes</span>
          <button type="button" className="btn" onClick={abrirPedido}>Alquilar y pagar</button>
        </div>
      )}

      {detalle && (
        <Drawer titulo={detalle.nombre} subtitulo={`${detalle.tipo} · ${pen(detalle.tarifaMensual)} al mes`} onCerrar={() => setDetalle(null)}>
          <EquipoImagen tipo={detalle.tipo} nombre={detalle.nombre} url={detalle.imagenUrl} variante="ficha" />
          <FichaVista e={detalle} />
          <AsistenteIA equipoId={detalle.equipoId} />
          <div className="drawer-pie">
            <button type="button" className="btn" onClick={() => { alternar(detalle.equipoId); setDetalle(null); }}>{carrito.includes(detalle.equipoId) ? "Quitar del pedido" : "Agregar al pedido"}</button>
          </div>
        </Drawer>
      )}

      {asesor && (
        <Drawer titulo="Te ayudo a elegir" subtitulo="Cuéntame qué necesitas y te recomiendo equipos del catálogo" onCerrar={() => setAsesor(false)} ancho={560}>
          <RecomendadorIA enCarrito={carrito} onAgregar={(id) => { if (!carrito.includes(id)) alternar(id); }} />
        </Drawer>
      )}

      {paso === "perfil" && <PerfilCliente onCerrar={() => setPaso(null)} onGuardado={() => setPaso("pedido")} />}

      {paso === "pedido" && (
        <Drawer titulo="Tu pedido" subtitulo="Revisa, elige la duración y paga" onCerrar={cerrarPedido} ancho={520}>
          {pendiente && (
            <p className="reserva-aviso" role="status">
              <Clock size={16} aria-hidden="true" /> Tus equipos están reservados hasta las <b>{hora(pendiente.pedido.reservaVence)}</b>. Revisa los datos y vuelve a intentar el pago.
            </p>
          )}
          <section className="pedido-seccion" aria-labelledby="h-equipos">
            <h3 id="h-equipos">Equipos ({lineas.length})</h3>
            <ul className="resumen-pedido">
              {lineas.map((e) => (
                <li key={e.equipoId}>
                  <EquipoImagen tipo={e.tipo} nombre={e.nombre} url={e.imagenUrl} variante="mini" />
                  <div className="pedido-info">
                    <strong>{e.nombre}</strong>
                    <small>{[e.tipo, e.marca, e.modelo].filter(Boolean).join(" · ")} · Garantía {e.garantiaMeses} meses</small>
                  </div>
                  <div className="pedido-precio"><b>{pen(e.tarifaMensual)}</b><small>al mes</small></div>
                  {!pendiente && <button type="button" className="icono-btn" aria-label={`Quitar ${e.nombre} del pedido`} onClick={() => alternar(e.equipoId)}><Trash2 size={15} aria-hidden="true" /></button>}
                </li>
              ))}
            </ul>
          </section>
          <section className="pedido-seccion" aria-labelledby="h-duracion">
            <h3 id="h-duracion">Duración del alquiler</h3>
            <div className="duraciones" role="group" aria-labelledby="h-duracion">
              {[1, 3, 6, 12, 24, 36].map((m) => (
                <button key={m} type="button" aria-pressed={meses === String(m)} disabled={!!pendiente} onClick={() => setMeses(String(m))}>{m} {m === 1 ? "mes" : "meses"}</button>
              ))}
            </div>
          </section>
          <dl className="pedido-total">
            <div><dt>Mensualidad</dt><dd>{pen(totalMes)}</dd></div>
            <div><dt>Duración</dt><dd>{meses} {meses === "1" ? "mes" : "meses"}</dd></div>
            <div><dt>Total del contrato</dt><dd>{pen(totalMes * Number(meses))}</dd></div>
            <div className="hoy"><dt>Hoy pagas</dt><dd>{pen(totalMes)}</dd></div>
          </dl>
          <p className="pedido-nota">Al pagar se reservan tus equipos por unos minutos. Hoy se cobra el primer mes; los siguientes se facturan mes a mes y los verás en Mis pagos.</p>
          <section className="pedido-seccion" aria-labelledby="h-pago">
            <h3 id="h-pago">Método de pago</h3>
            <PagoForm monto={totalMes} textoBoton={pendiente ? "Reintentar pago" : "Pagar"} onPagar={pagar} onCancelar={cerrarPedido} />
          </section>
        </Drawer>
      )}

      {paso === "listo" && resultado && (
        <Drawer titulo="¡Pago aprobado!" subtitulo={`Contrato ${resultado.contrato.contratoId} · hasta ${fechaCorta(resultado.contrato.fin)}`} onCerrar={() => setPaso(null)} ancho={600}>
          <p>Tu alquiler ya está activo. Encuentras tus equipos en <b>Mis equipos</b> y tu comprobante en <b>Mis pagos</b>.</p>
          {resultado.correoEnviadoA
            ? <p className="sugerencia">Te enviamos el comprobante a <b>{resultado.correoEnviadoA}</b>.</p>
            : <p className="muted">No pudimos enviarte el comprobante por correo. Puedes imprimirlo o guardarlo en PDF con el botón de abajo.</p>}
          <ComprobanteVista c={resultado.comprobante} />
        </Drawer>
      )}
    </>
  );
}

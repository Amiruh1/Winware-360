"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CreditCard, Smartphone } from "lucide-react";
import { Texto } from "./Campos";
import { pen } from "@/lib/format";
import type { DatosPago, MetodoPago } from "@/lib/tipos";

const METODOS: { id: MetodoPago; nombre: string }[] = [{ id: "tarjeta", nombre: "Tarjeta" }, { id: "yape", nombre: "Yape" }, { id: "plin", nombre: "Plin" }];
const soloDigitos = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max);
// Tarjeta: exactamente 16 dígitos (se muestran en grupos de 4: 19 caracteres). CVV: exactamente 3 dígitos.
const DIGITOS_TARJETA = 16, DIGITOS_CVV = 3;
const agruparTarjeta = (s: string) => soloDigitos(s, DIGITOS_TARJETA).replace(/(.{4})/g, "$1 ").trim();
const formatoVence = (s: string) => { const d = soloDigitos(s, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

/** Formulario de pago SIMULADO: tarjeta, Yape o Plin. No se realiza ningún cobro real. */
export default function PagoForm({ monto, textoBoton, onPagar, onCancelar }: {
  monto: number; textoBoton: string; onPagar: (pago: DatosPago) => Promise<void>; onCancelar?: () => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>("tarjeta");
  const [numero, setNumero] = useState(""); const [vence, setVence] = useState(""); const [cvv, setCvv] = useState(""); const [titular, setTitular] = useState("");
  const [celular, setCelular] = useState(""); const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (metodo === "tarjeta" && soloDigitos(numero, 99).length !== DIGITOS_TARJETA) { setError("El número de tarjeta debe tener 16 dígitos."); return; }
    if (metodo === "tarjeta" && cvv.length !== DIGITOS_CVV) { setError("El CVV debe tener 3 dígitos."); return; }
    setEnviando(true);
    try {
      await onPagar(metodo === "tarjeta" ? { metodo, numero, vence, cvv, titular } : { metodo, celular, codigo });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo procesar el pago."); }
    finally { setEnviando(false); }
  }

  return (
    <form className="formulario" onSubmit={(e) => void enviar(e)} aria-label="Pago">
      <div className="tabs" role="radiogroup" aria-label="Método de pago">
        {METODOS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={metodo === m.id} aria-pressed={metodo === m.id} onClick={() => { setMetodo(m.id); setError(null); }}>
            {m.id === "tarjeta" ? <CreditCard size={15} aria-hidden="true" /> : <Smartphone size={15} aria-hidden="true" />} {m.nombre}
          </button>
        ))}
      </div>

      {metodo === "tarjeta" ? (
        <>
          <Texto etiqueta="Número de tarjeta" requerido valor={numero} onCambio={(v) => setNumero(agruparTarjeta(v))} autoComplete="off" placeholder="4111 1111 1111 1111"
            maxLength={DIGITOS_TARJETA + 3} ayuda="16 dígitos." />
          <div className="fila-campos">
            <Texto etiqueta="Vence (MM/AA)" requerido valor={vence} onCambio={(v) => setVence(formatoVence(v))} autoComplete="off" placeholder="12/29" />
            <Texto etiqueta="CVV" requerido valor={cvv} onCambio={(v) => setCvv(soloDigitos(v, DIGITOS_CVV))} autoComplete="off" placeholder="123" maxLength={DIGITOS_CVV} ayuda="3 dígitos." />
          </div>
          <Texto etiqueta="Nombre del titular" requerido valor={titular} onCambio={setTitular} autoComplete="off" maxLength={80} />
        </>
      ) : (
        <>
          <Texto etiqueta={`Celular de ${metodo === "yape" ? "Yape" : "Plin"}`} requerido valor={celular} onCambio={(v) => setCelular(soloDigitos(v, 9))} autoComplete="off" placeholder="987654321" ayuda="9 dígitos, empieza con 9." />
          <Texto etiqueta={metodo === "yape" ? "Código de aprobación de Yape" : "Código de aprobación de Plin"} requerido valor={codigo} onCambio={(v) => setCodigo(soloDigitos(v, 6))} autoComplete="off" placeholder="123456" ayuda="6 dígitos." />
        </>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <div className="drawer-pie">
        {onCancelar && <button type="button" className="btn btn-secundario" onClick={onCancelar}>Volver</button>}
        <button type="submit" className="btn" disabled={enviando}>{enviando ? "Procesando pago…" : `${textoBoton} · ${pen(monto)}`}</button>
      </div>
    </form>
  );
}

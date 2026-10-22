"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { useToast } from "@/components/Toast";
import { useContadores } from "@/components/Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaHora, iniciales } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import type { Rol, Usuario } from "@/lib/tipos";

const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: "Administrador", etiqueta: "Administrador" }, { valor: "Administracion", etiqueta: "Administración" }, { valor: "Tecnico", etiqueta: "Técnico" },
];
const nombreRol = (r: Usuario["rol"]) => r === "Cliente" ? "Cliente" : ROLES.find((x) => x.valor === r)?.etiqueta ?? "Sin asignar";

export default function Usuarios() {
  const { puede, me } = useAuth();
  const aviso = useToast();
  const { refrescar } = useContadores();
  const lista = useCarga(() => api<{ items: Usuario[] }>("/usuarios"), []);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [elegido, setElegido] = useState<Record<string, string>>({});

  if (!puede("usuarios")) return <SinAcceso />;

  async function cambiar(u: Usuario, cuerpo: Record<string, string>, ok: string) {
    setOcupado(u.correo);
    try {
      await api(`/usuarios/${encodeURIComponent(u.correo)}`, { metodo: "PATCH", cuerpo });
      aviso(ok);
      await Promise.all([lista.recargar(), refrescar()]);
    } catch (x) { aviso(mensajeDe(x), "error"); } finally { setOcupado(null); }
  }

  const items = [...(lista.datos?.items ?? [])].sort((a, b) => (a.estado === "Pendiente" ? 0 : 1) - (b.estado === "Pendiente" ? 0 : 1) || a.nombre.localeCompare(b.nombre));
  const pendientes = items.filter((u) => u.estado === "Pendiente").length;

  return (
    <>
      <PageHeader titulo="Usuarios" descripcion="Aprueba a quienes se registran y define qué puede hacer cada persona." />
      {pendientes > 0 && <p className="alert alert-warn" role="status">{pendientes === 1 ? "Hay 1 persona esperando aprobación." : `Hay ${pendientes} personas esperando aprobación.`} Asígnale un rol para darle acceso.</p>}

      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && (items.length === 0 ? <Vacio>Aún no hay usuarios.</Vacio> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {items.map((u) => {
              const yo = u.correo === me?.correo;
              const rol = elegido[u.correo] ?? (u.rol !== "Sin asignar" ? u.rol : "");
              return (
                <tr key={u.correo}>
                  <td><div className="detail-head"><span className="avatar" aria-hidden="true">{iniciales(u.nombre)}</span><div><strong>{u.nombre}{yo && " (tú)"}</strong><small className="muted" style={{ display: "block" }}>{u.correo}</small></div></div></td>
                  <td>
                    {yo || u.rol === "Cliente" ? <>{nombreRol(u.rol)}{u.clienteId && <small className="muted"> {u.clienteId}</small>}</> : (
                      <select value={rol} disabled={ocupado === u.correo} aria-label={`Rol de ${u.nombre}`}
                        onChange={(e) => { const v = e.target.value; setElegido((p) => ({ ...p, [u.correo]: v })); if (v && u.estado !== "Pendiente") void cambiar(u, { rol: v }, "Rol actualizado."); }}>
                        <option value="">Sin asignar</option>
                        {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                      </select>
                    )}
                  </td>
                  <td><Badge tono={u.estado === "Activo" ? "ok" : u.estado === "Pendiente" ? "warn" : "neutral"} dot>{u.estado}</Badge></td>
                  <td>{u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : <span className="muted">Nunca</span>}</td>
                  <td>
                    {!yo && (
                      <div className="celda-acciones">
                        {u.estado === "Pendiente" && <button type="button" className="btn btn-sm" disabled={!rol || ocupado === u.correo} onClick={() => void cambiar(u, { rol, estado: "Activo" }, `${u.nombre} ya tiene acceso.`)}>Aprobar</button>}
                        {u.estado === "Activo" && <button type="button" className="btn btn-secundario btn-sm" disabled={ocupado === u.correo} onClick={() => void cambiar(u, { estado: "Inactivo" }, "Usuario desactivado.")}>Desactivar</button>}
                        {u.estado === "Inactivo" && <button type="button" className="btn btn-secundario btn-sm" disabled={ocupado === u.correo || u.rol === "Sin asignar"} onClick={() => void cambiar(u, { estado: "Activo" }, "Usuario reactivado.")}>Reactivar</button>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      ))}
    </>
  );
}

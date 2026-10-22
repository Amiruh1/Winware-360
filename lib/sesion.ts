// Guarda los tokens en el navegador y los renueva antes de que venzan.
import { renovar } from "./cognito";
import type { Tokens } from "./cognito";

const CLAVE = "winware360.sesion";
let enMemoria: Tokens | null = null;
let renovando: Promise<Tokens | null> | null = null;
const oyentes = new Set<() => void>();

function leerAlmacen(): Tokens | null {
  try {
    const t = window.localStorage.getItem(CLAVE);
    return t ? (JSON.parse(t) as Tokens) : null;
  } catch { return null; }
}
function escribirAlmacen(t: Tokens | null) {
  try {
    if (t) window.localStorage.setItem(CLAVE, JSON.stringify(t));
    else window.localStorage.removeItem(CLAVE);
  } catch { /* modo privado o sin almacenamiento: la sesión vive solo en memoria */ }
}

export function guardarSesion(t: Tokens | null) {
  enMemoria = t;
  escribirAlmacen(t);
  if (!t) oyentes.forEach((f) => f());
}
export function sesionActual(): Tokens | null {
  if (!enMemoria) enMemoria = leerAlmacen();
  return enMemoria;
}
/** Avisa cuando la sesión se cierra sola (por ejemplo, el token de renovación venció). */
export function alCerrarSesion(f: () => void): () => void {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

async function renovarSesion(): Promise<Tokens | null> {
  const actual = sesionActual();
  if (!actual?.refreshToken) { guardarSesion(null); return null; }
  if (!renovando) {
    renovando = renovar(actual.refreshToken)
      .then((t) => { guardarSesion(t); return t; })
      .catch(() => { guardarSesion(null); return null; })
      .finally(() => { renovando = null; });
  }
  return renovando;
}

/** Devuelve un idToken vigente (renovándolo si falta menos de 1 minuto). null = no hay sesión. */
export async function obtenerToken(forzar = false): Promise<string | null> {
  const t = sesionActual();
  if (!t) return null;
  if (!forzar && t.expiraEn - Date.now() > 60_000) return t.idToken;
  const nuevo = await renovarSesion();
  return nuevo?.idToken ?? null;
}

"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { Texto } from "@/components/Campos";
import { Cargando } from "@/components/Estados";
import AvisoPrivacidad from "@/components/AvisoPrivacidad";
import { recordarTipoCuenta, useAuth } from "@/lib/auth";
import { CognitoError, confirmar, olvideMiClave, registrar, reenviarCodigo, restablecerClave } from "@/lib/cognito";

type Paso = "entrar" | "crear" | "confirmar" | "nueva-clave" | "olvide" | "restablecer";
const REQUISITOS = "Mínimo 10 caracteres, con mayúscula, minúscula y número.";

export default function Login() {
  const { estado, login, completarNuevaClave } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState<"cliente" | "personal">("cliente");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [sesion, setSesion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { if (estado === "autenticado") router.replace("/"); }, [estado, router]);

  const ir = (p: Paso, mensaje: string | null = null) => { setPaso(p); setError(null); setInfo(mensaje); setClave(""); setClave2(""); setCodigo(""); };

  async function ejecutar(f: () => Promise<void>) {
    setError(null); setInfo(null); setOcupado(true);
    try { await f(); }
    catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error inesperado."); }
    finally { setOcupado(false); }
  }

  const alEntrar = (e: FormEvent) => { e.preventDefault(); void ejecutar(async () => {
    try {
      const r = await login(correo, clave);
      if (r.tipo === "nueva-clave") { setSesion(r.sesion); ir("nueva-clave", "Es tu primer ingreso: elige una contraseña nueva."); }
    } catch (err) {
      if (err instanceof CognitoError && err.codigo === "UserNotConfirmedException") {
        await reenviarCodigo(correo);
        ir("confirmar", "Te enviamos un código a tu correo para confirmarlo.");
        return;
      }
      throw err;
    }
  }); };

  const alCrear = (e: FormEvent) => { e.preventDefault(); void ejecutar(async () => {
    if (!aceptaPrivacidad) throw new Error("Debes aceptar el aviso de privacidad para crear tu cuenta.");
    if (clave !== clave2) throw new Error("Las contraseñas no coinciden.");
    await registrar(nombre, correo, clave);
    recordarTipoCuenta(correo, tipoCuenta);
    ir("confirmar", "Te enviamos un código de verificación a tu correo.");
  }); };

  const alConfirmar = (e: FormEvent) => { e.preventDefault(); void ejecutar(async () => {
    await confirmar(correo, codigo);
    ir("entrar", tipoCuenta === "cliente" ? "Correo confirmado. Ya puedes iniciar sesión." : "Correo confirmado. Ya puedes iniciar sesión; un administrador deberá aprobar tu cuenta.");
  }); };

  const alNuevaClave = (e: FormEvent) => { e.preventDefault(); void ejecutar(async () => {
    if (clave !== clave2) throw new Error("Las contraseñas no coinciden.");
    await completarNuevaClave(correo, clave, sesion);
  }); };

  const alOlvide = (e: FormEvent) => { e.preventDefault(); void ejecutar(async () => {
    await olvideMiClave(correo);
    ir("restablecer", "Si el correo existe, te enviamos un código para elegir una contraseña nueva.");
  }); };

  const alRestablecer = (e: FormEvent) => { e.preventDefault(); void ejecutar(async () => {
    if (clave !== clave2) throw new Error("Las contraseñas no coinciden.");
    await restablecerClave(correo, codigo, clave);
    ir("entrar", "Contraseña actualizada. Ya puedes iniciar sesión.");
  }); };

  if (estado === "cargando" || estado === "autenticado") {
    return <main className="pantalla-centro"><Cargando texto="Abriendo tu sesión…" /></main>;
  }

  return (
    <main className="pantalla-centro">
      <div className="tarjeta-centro">
        <div className="logo-centro"><Logo size={44} /></div>
        <h1>Winware 360</h1>
        <p className="muted">Alquiler y gestión de equipos tecnológicos de Winware S.A.C.</p>

        {(paso === "entrar" || paso === "crear") && (
          <div className="tabs" role="tablist" aria-label="Acceso">
            <button type="button" role="tab" aria-selected={paso === "entrar"} aria-pressed={paso === "entrar"} onClick={() => ir("entrar")}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={paso === "crear"} aria-pressed={paso === "crear"} onClick={() => ir("crear")}>Crear cuenta</button>
          </div>
        )}

        {info && <p className="aviso-ok" role="status">{info}</p>}
        {error && <p className="aviso-error" role="alert">{error}</p>}

        {paso === "entrar" && (
          <form className="formulario" onSubmit={alEntrar}>
            <Texto etiqueta="Correo" tipo="email" valor={correo} onCambio={setCorreo} requerido autoComplete="username" />
            <Texto etiqueta="Contraseña" tipo="password" valor={clave} onCambio={setClave} requerido autoComplete="current-password" />
            <button type="submit" className="btn" disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar"}</button>
            <button type="button" className="enlace" onClick={() => ir("olvide")}>Olvidé mi contraseña</button>
            <AvisoPrivacidad />
          </form>
        )}

        {paso === "crear" && (
          <form className="formulario" onSubmit={alCrear}>
            <fieldset className="tipo-cuenta">
              <legend>¿Cómo vas a usar Winware 360?</legend>
              <label><input type="radio" name="tipoCuenta" checked={tipoCuenta === "cliente"} onChange={() => setTipoCuenta("cliente")} /> <span><b>Soy cliente</b><small>Quiero alquilar equipos</small></span></label>
              <label><input type="radio" name="tipoCuenta" checked={tipoCuenta === "personal"} onChange={() => setTipoCuenta("personal")} /> <span><b>Soy personal de Winware</b><small>Un administrador aprobará mi cuenta</small></span></label>
            </fieldset>
            <Texto etiqueta="Nombre completo" valor={nombre} onCambio={setNombre} requerido autoComplete="name" maxLength={120} />
            <Texto etiqueta="Correo" tipo="email" valor={correo} onCambio={setCorreo} requerido autoComplete="username" />
            <Texto etiqueta="Contraseña" tipo="password" valor={clave} onCambio={setClave} requerido autoComplete="new-password" ayuda={REQUISITOS} />
            <Texto etiqueta="Repite la contraseña" tipo="password" valor={clave2} onCambio={setClave2} requerido autoComplete="new-password" />
            <AvisoPrivacidad />
            <label className="check acepta-privacidad">
              <input type="checkbox" checked={aceptaPrivacidad} onChange={(e) => setAceptaPrivacidad(e.target.checked)} required />
              He leído y acepto el aviso de privacidad
            </label>
            <button type="submit" className="btn" disabled={ocupado || !aceptaPrivacidad}>{ocupado ? "Creando…" : "Crear cuenta"}</button>
            <small>{tipoCuenta === "cliente" ? "Podrás alquilar equipos apenas confirmes tu correo." : "Tu cuenta quedará pendiente hasta que un administrador de Winware la apruebe."}</small>
          </form>
        )}

        {paso === "confirmar" && (
          <form className="formulario" onSubmit={alConfirmar}>
            <Texto etiqueta={`Código enviado a ${correo}`} valor={codigo} onCambio={setCodigo} requerido maxLength={10} autoComplete="one-time-code" />
            <button type="submit" className="btn" disabled={ocupado}>Confirmar correo</button>
            <button type="button" className="enlace" onClick={() => void ejecutar(async () => { await reenviarCodigo(correo); setInfo("Te enviamos un código nuevo."); })}>Reenviar código</button>
            <button type="button" className="enlace" onClick={() => ir("entrar")}>Volver</button>
          </form>
        )}

        {paso === "nueva-clave" && (
          <form className="formulario" onSubmit={alNuevaClave}>
            <Texto etiqueta="Contraseña nueva" tipo="password" valor={clave} onCambio={setClave} requerido autoComplete="new-password" ayuda={REQUISITOS} />
            <Texto etiqueta="Repite la contraseña" tipo="password" valor={clave2} onCambio={setClave2} requerido autoComplete="new-password" />
            <button type="submit" className="btn" disabled={ocupado}>Guardar y entrar</button>
          </form>
        )}

        {paso === "olvide" && (
          <form className="formulario" onSubmit={alOlvide}>
            <Texto etiqueta="Correo de tu cuenta" tipo="email" valor={correo} onCambio={setCorreo} requerido autoComplete="username" />
            <button type="submit" className="btn" disabled={ocupado}>Enviarme un código</button>
            <button type="button" className="enlace" onClick={() => ir("entrar")}>Volver</button>
          </form>
        )}

        {paso === "restablecer" && (
          <form className="formulario" onSubmit={alRestablecer}>
            <Texto etiqueta="Código recibido" valor={codigo} onCambio={setCodigo} requerido maxLength={10} autoComplete="one-time-code" />
            <Texto etiqueta="Contraseña nueva" tipo="password" valor={clave} onCambio={setClave} requerido autoComplete="new-password" ayuda={REQUISITOS} />
            <Texto etiqueta="Repite la contraseña" tipo="password" valor={clave2} onCambio={setClave2} requerido autoComplete="new-password" />
            <button type="submit" className="btn" disabled={ocupado}>Cambiar contraseña</button>
            <button type="button" className="enlace" onClick={() => ir("entrar")}>Volver</button>
          </form>
        )}
      </div>
    </main>
  );
}

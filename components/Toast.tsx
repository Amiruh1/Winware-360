"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Tono = "ok" | "error";
interface Aviso { id: number; texto: string; tono: Tono }
const Ctx = createContext<(texto: string, tono?: Tono) => void>(() => undefined);
let contador = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const mostrar = useCallback((texto: string, tono: Tono = "ok") => {
    const id = ++contador;
    setAvisos((a) => [...a, { id, texto, tono }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tono === "error" ? 8000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`toast toast-${a.tono}`}>
            {a.tono === "ok" ? <CircleCheck size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

import type { ReactNode } from "react";

export type Tono = "ok" | "warn" | "danger" | "info" | "neutral";

export default function Badge({ tono = "neutral", dot = false, children }: { tono?: Tono; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`badge badge-${tono}`}>
      {dot && <i className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

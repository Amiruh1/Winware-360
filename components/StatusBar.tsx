import type { Tono } from "./Badge";

export type ItemEstado = { label: string; valor: number; tono: Extract<Tono, "ok" | "warn" | "danger"> };

export default function StatusBar({ items }: { items: ItemEstado[] }) {
  const total = items.reduce((s, i) => s + i.valor, 0) || 1;
  return (
    <div>
      <div className="statusbar" role="img" aria-label={items.map((i) => `${i.label}: ${i.valor}`).join(", ")}>
        {items.filter((i) => i.valor > 0).map((i) => (
          <span key={i.label} className={`seg seg-${i.tono}`} style={{ flexGrow: i.valor }} title={`${i.label}: ${i.valor} de ${total}`} />
        ))}
      </div>
      <ul className="legend">
        {items.map((i) => (
          <li key={i.label}>
            <i className={`swatch swatch-${i.tono}`} aria-hidden="true" />
            <span>{i.label}</span>
            <strong>{i.valor}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

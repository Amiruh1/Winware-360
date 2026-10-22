export type TonoMeter = "accent" | "warn" | "danger";

export default function Meter({ valor, tono = "accent", etiqueta }: { valor: number; tono?: TonoMeter; etiqueta: string }) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div className={`meter meter-${tono}`} role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

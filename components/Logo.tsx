/** Logo de Winware (public/logo-winware.png). La ruta incluye el subdirectorio cuando se publica en GitHub Pages. */
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-winware.png`} width={size} height={size} alt="" aria-hidden="true" className="logo" />
  );
}

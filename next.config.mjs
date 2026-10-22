/** @type {import('next').NextConfig} */
// BASE_PATH solo se usa al publicar en un subdirectorio (GitHub Pages: /nombre-del-repositorio). En localhost queda vacío.
const basePath = process.env.BASE_PATH ?? "";
const nextConfig = {
  // Sitio estático: se publica la carpeta "out" (GitHub Pages, Amplify Hosting, Vercel, S3 + CloudFront, etc.)
  output: "export",
  trailingSlash: true, // /inventario/ -> inventario/index.html: funciona en cualquier alojamiento estático
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Las pruebas de aceptación compilan una copia aparte (apuntando al entorno local) para no tocar la carpeta "out" que se publica.
  ...(process.env.WINWARE_DIST_DIR ? { distDir: process.env.WINWARE_DIST_DIR } : {}),
};
export default nextConfig;

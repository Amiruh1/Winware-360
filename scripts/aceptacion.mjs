// Corre las pruebas de aceptación con Selenium sin cuenta de AWS:
// 1) compila una copia del portal en .aceptacion/ apuntando al entorno local (no toca la carpeta out/ que se publica),
// 2) levanta el entorno local del backend (portal + API + Cognito simulado),
// 3) ejecuta pruebas-aceptacion/aceptacion.test.mjs en Microsoft Edge y guarda el resultado en pruebas-aceptacion/resultado.json.
// Uso: npm run test:aceptacion            (agrega -- --sin-compilar para reutilizar la copia ya compilada)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(process.env.WINWARE_BACKEND ?? path.join(raiz, "..", "winware-backend"));
const PUERTO = process.env.WINWARE_PUERTO ?? "4010";
const BASE = `http://localhost:${PUERTO}`;
const SITIO = path.join(raiz, ".aceptacion");

if (!process.argv.includes("--sin-compilar") || !existsSync(SITIO)) {
  console.log("Compilando el portal para el entorno local…");
  const r = spawnSync(process.execPath, [path.join(raiz, "node_modules", "next", "dist", "bin", "next"), "build"], {
    cwd: raiz, stdio: "inherit",
    env: { ...process.env, WINWARE_DIST_DIR: ".aceptacion", NEXT_PUBLIC_API_URL: `${BASE}/api`, NEXT_PUBLIC_COGNITO_ENDPOINT: `${BASE}/cognito`, NEXT_PUBLIC_COGNITO_CLIENT_ID: "local" },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log(`Levantando el entorno local en ${BASE}…`);
const servidor = spawn(process.execPath, ["--no-warnings", "scripts/servidor-local.ts", "--puerto", PUERTO, "--sitio", SITIO], { cwd: backend, stdio: ["ignore", "ignore", "inherit"] });
const terminar = (codigo) => { servidor.kill(); process.exit(codigo); };
let listo = false;
for (let i = 0; i < 50 && !listo; i++) {
  try { listo = (await fetch(`${BASE}/__salud`)).ok; } catch { await new Promise((ok) => setTimeout(ok, 200)); }
}
if (!listo) { console.error("El entorno local no respondió."); terminar(1); }

const tap = path.join(raiz, "pruebas-aceptacion", "resultado.tap");
const inicio = new Date();
const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "--test-reporter-destination=stdout", "--test-reporter=tap", `--test-reporter-destination=${tap}`, "pruebas-aceptacion/aceptacion.test.mjs"],
  { cwd: raiz, stdio: "inherit", env: { ...process.env, WINWARE_URL: BASE } });

// resultado en JSON para el informe de pruebas del backend (npm run informe)
const lineas = readFileSync(tap, "utf8").split(/\r?\n/);
const resultados = [];
lineas.forEach((l, i) => {
  const m = /^(not ok|ok) \d+ - (.+?)( # .*)?$/.exec(l);
  if (!m) return;
  const ms = lineas.slice(i + 1, i + 6).map((x) => /duration_ms: ([\d.]+)/.exec(x)?.[1]).find(Boolean);
  resultados.push({ nombre: m[2].trim(), ok: m[1] === "ok", ms: ms ? Number(ms) : null });
});
writeFileSync(path.join(raiz, "pruebas-aceptacion", "resultado.json"), JSON.stringify({ fecha: inicio.toISOString(), navegador: "Microsoft Edge (sin interfaz) con Selenium WebDriver", resultados }, null, 2));
console.log(`\nAceptación: ${resultados.filter((x) => x.ok).length} de ${resultados.length} aprobadas.`);
terminar(r.status ?? 1);

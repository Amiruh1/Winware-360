// Pruebas de aceptación (PA) con Selenium WebDriver sobre Microsoft Edge.
// Recorren el portal como lo haría una persona, contra el entorno local (portal + API + Cognito simulado).
// Se ejecutan con `npm run test:aceptacion`, que compila el portal, levanta el entorno y corre este archivo.
// Las pruebas siguen un orden: cada una parte de lo que dejó la anterior (por ejemplo, la cuenta creada en PA-02).
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { Builder, By, Key, until } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";

const BASE = process.env.WINWARE_URL ?? "http://localhost:4010";
const ESPERA = 15_000;
const sello = Date.now().toString(36);
const CLIENTE = { nombre: "Cliente Aceptación", correo: `cliente.${sello}@prueba.pe`, clave: "Aceptacion2026", dni: "70" + String(Date.now()).slice(-6) };
const PERSONAL = { admin: "gerencia@winware.example", tecnico: "tecnico1@winware.example", clave: "Winware2026" };
const TITULO_TICKET = `Laptop no enciende ${sello}`;

/** @type {import("selenium-webdriver").WebDriver} */
let d;

before(async () => {
  const opciones = new edge.Options().addArguments("--headless=new", "--window-size=1400,1000", "--lang=es-PE");
  d = await new Builder().forBrowser("MicrosoftEdge").setEdgeOptions(opciones).build();
});
after(async () => { await d?.quit(); });

// ---------- ayudas para hablar con la página en sus propios términos ----------
const xp = (s) => `"${s.replace(/"/g, "")}"`;
const ir = (ruta) => d.get(BASE + ruta);
const visible = async (localizador) => { const el = await d.wait(until.elementLocated(localizador), ESPERA); await d.wait(until.elementIsVisible(el), ESPERA); return el; };
/** Campo de formulario por su etiqueta visible (por ejemplo "Correo"). */
async function campo(etiqueta) {
  const label = await visible(By.xpath(`//label[normalize-space(.)=${xp(etiqueta)} or normalize-space(.)=${xp(etiqueta + " *")}]`));
  return d.findElement(By.id(await label.getAttribute("for")));
}
async function escribir(etiqueta, texto) { const el = await campo(etiqueta); await el.sendKeys(Key.chord(Key.CONTROL, "a"), Key.BACK_SPACE); await el.sendKeys(texto); }
/** Botón visible y habilitado cuyo texto empieza con `texto`. */
async function pulsar(texto) {
  const loc = By.xpath(`//button[starts-with(normalize-space(.), ${xp(texto)}) or @aria-label=${xp(texto)}]`);
  await d.wait(async () => {
    for (const b of await d.findElements(loc)) if (await b.isDisplayed() && await b.isEnabled()) { await d.executeScript("arguments[0].scrollIntoView({block:'center'})", b); await b.click(); return true; }
    return false;
  }, ESPERA, `No apareció el botón «${texto}»`);
}
// Selenium lee el texto como se ve en pantalla (los títulos en mayúsculas por CSS llegan en mayúsculas): se compara sin distinguirlas.
const esperarTexto = (texto) => d.wait(async () => (await d.findElement(By.css("body")).getText()).toLowerCase().includes(texto.toLowerCase()), ESPERA, `No apareció el texto «${texto}»`);
const marcar = async (textoEtiqueta) => (await visible(By.xpath(`//label[contains(normalize-space(.), ${xp(textoEtiqueta)})]//input[@type='checkbox']`))).click();
async function iniciarSesion(correo, clave) {
  await ir("/login/");
  await escribir("Correo", correo); await escribir("Contraseña", clave);
  await pulsar("Entrar");
  await d.wait(async () => !(await d.getCurrentUrl()).includes("/login"), ESPERA, "No se pudo iniciar sesión");
}
async function salir() { await ir("/login/"); await d.executeScript("localStorage.clear()"); await ir("/login/"); }

/** Prueba con captura de pantalla si falla (pruebas-aceptacion/capturas/PA-xx.png). */
function prueba(nombre, fn) {
  test(nombre, { timeout: 90_000 }, async () => {
    try { await fn(); }
    catch (e) {
      try { await mkdir("pruebas-aceptacion/capturas", { recursive: true }); await writeFile(`pruebas-aceptacion/capturas/${nombre.slice(0, 5)}.png`, await d.takeScreenshot(), "base64"); } catch { /* sin captura */ }
      throw e;
    }
  });
}

// ---------- casos ----------
prueba("PA-01: credenciales incorrectas muestran un mensaje genérico", async () => {
  await ir("/login/");
  await esperarTexto("Aviso de privacidad");                                      // aviso visible al iniciar sesión (CU-01)
  await escribir("Correo", PERSONAL.tecnico); await escribir("Contraseña", "ClaveIncorrecta1");
  await pulsar("Entrar");
  await esperarTexto("Correo o contraseña incorrectos.");
  assert.ok((await d.getCurrentUrl()).includes("/login"));
});

prueba("PA-02: un cliente crea su cuenta aceptando el aviso de privacidad y entra al catálogo", async () => {
  await ir("/login/");
  await pulsar("Crear cuenta");
  await escribir("Nombre completo", CLIENTE.nombre); await escribir("Correo", CLIENTE.correo);
  await escribir("Contraseña", CLIENTE.clave); await escribir("Repite la contraseña", CLIENTE.clave);
  const crear = await d.findElement(By.xpath("//form//button[@type='submit' and starts-with(normalize-space(.), 'Crear cuenta')]"));
  assert.equal(await crear.isEnabled(), false, "Sin aceptar el aviso no se puede crear la cuenta");
  await marcar("He leído y acepto el aviso de privacidad");
  await crear.click();                                                            // el botón del formulario, no la pestaña del mismo nombre
  await escribir(`Código enviado a ${CLIENTE.correo}`, "123456");
  await pulsar("Confirmar correo");
  await esperarTexto("Correo confirmado");
  await escribir("Contraseña", CLIENTE.clave);
  await pulsar("Entrar");
  await esperarTexto("Catálogo de equipos");
});

prueba("PA-03: el cliente alquila un equipo, registra sus datos y paga con tarjeta", async () => {
  await (await visible(By.xpath("//li[contains(@class,'producto')]//button[normalize-space(.)='Agregar']"))).click();
  await pulsar("Alquilar y pagar");
  await esperarTexto("Tus datos de facturación");
  await escribir("Nombre completo o razón social", CLIENTE.nombre); await escribir("DNI o RUC", CLIENTE.dni);
  await escribir("Teléfono", "987654321"); await escribir("Dirección", "Av. Prueba 123, Lima");
  await pulsar("Guardar");
  await esperarTexto("Método de pago");
  await pulsar("1 mes");
  await escribir("Número de tarjeta", "4111111111111111"); await escribir("Vence (MM/AA)", "1229");
  await escribir("CVV", "123"); await escribir("Nombre del titular", CLIENTE.nombre);
  await pulsar("Pagar");
  await esperarTexto("¡Pago aprobado!");
  await esperarTexto("BOLETA DE VENTA");
  await pulsar("Cerrar");
});

prueba("PA-04: un pago rechazado deja el pedido reservado y se puede reintentar", async () => {
  await (await visible(By.xpath("//li[contains(@class,'producto')]//button[normalize-space(.)='Agregar']"))).click();
  await pulsar("Alquilar y pagar");
  if ((await d.findElements(By.xpath("//*[normalize-space(.)='Tus datos de facturación']"))).length) await pulsar("Guardar");
  await esperarTexto("Método de pago");
  await escribir("Número de tarjeta", "4000000000000002"); await escribir("Vence (MM/AA)", "1229");
  await escribir("CVV", "123"); await escribir("Nombre del titular", CLIENTE.nombre);
  await pulsar("Pagar");
  await esperarTexto("rechazó la tarjeta");
  await esperarTexto("Tus equipos están reservados hasta");
  await escribir("Número de tarjeta", "4111111111111111");
  await pulsar("Reintentar pago");
  await esperarTexto("¡Pago aprobado!");
  await pulsar("Cerrar");
});

prueba("PA-05: el cliente ve sus contratos y abre el documento del contrato", async () => {
  await ir("/mis-contratos/");
  await esperarTexto("Contratos vigentes");
  await pulsar("Ver contrato");
  await esperarTexto("CONTRATO DE ALQUILER");
  await esperarTexto(CLIENTE.nombre);
  await pulsar("Cerrar");
});

prueba("PA-06: el cliente reporta un problema y ve la prioridad sugerida", async () => {
  await ir("/soporte/");
  await pulsar("Reportar problema");
  const equipo = await campo("Equipo");
  await (await equipo.findElements(By.css("option")))[1].click();
  await escribir("Resumen del problema", TITULO_TICKET);
  await escribir("Cuéntanos qué pasa", "La laptop no enciende desde esta mañana.");
  await pulsar("Enviar reporte");
  await esperarTexto("Reporte registrado");
  await esperarTexto("Prioridad sugerida");
  assert.match(await d.findElement(By.css(".drawer")).getText(), /Alta/);       // "no enciende" se sugiere como Alta
  await pulsar("Ver mi reporte");
  await esperarTexto(TITULO_TICKET);
});

prueba("PA-07: el cliente no puede entrar a las secciones del personal", async () => {
  await ir("/inventario/");
  await esperarTexto("No tienes acceso a esta sección");
  const menu = await d.findElement(By.css(".sidebar")).getText();
  assert.doesNotMatch(menu, /Inventario|Usuarios|Finanzas/);
});

prueba("PA-08: cerrar sesión vuelve a la pantalla de inicio de sesión", async () => {
  await ir("/catalogo/");
  await pulsar("Cerrar sesión");
  await d.wait(until.urlContains("/login"), ESPERA);
  await esperarTexto("Iniciar sesión");
});

prueba("PA-09: el técnico confirma la prioridad, atiende y resuelve el ticket del cliente", async () => {
  await salir();
  await iniciarSesion(PERSONAL.tecnico, PERSONAL.clave);
  await ir("/mesa-de-ayuda/");
  await (await visible(By.xpath(`//button[contains(@class,'tcard')][.//strong[normalize-space(.)=${xp(TITULO_TICKET)}]]`))).click();
  await esperarTexto("Prioridad sugerida: Alta");
  await pulsar("Confirmar prioridad");
  await esperarTexto("confirmada por");
  await pulsar("Tomar / en atención");
  await esperarTexto("Marcar como resuelto");
  await pulsar("Marcar como resuelto");
  await esperarTexto("Ticket cerrado");
});

prueba("PA-10: el administrador consulta los indicadores", async () => {
  await salir();
  await iniciarSesion(PERSONAL.admin, PERSONAL.clave);
  await esperarTexto("Hola,");
  await ir("/indicadores/");                                                      // la página no tiene pestaña en el menú
  await esperarTexto("Tiempo de respuesta");
  await esperarTexto("Concordancia de la prioridad");
  await esperarTexto("Demanda de equipos");
});

prueba("PA-11: no se puede eliminar un equipo con tickets abiertos", async () => {
  await ir("/inventario/?equipo=EQ-1004");
  await pulsar("Eliminar");
  await pulsar("Sí, eliminar");
  await esperarTexto("ticket abierto");
  await ir("/inventario/");
  await esperarTexto("EQ-1004");
});

prueba("PA-12: el administrador elimina un equipo disponible", async () => {
  await ir("/inventario/");
  await d.findElement(By.css("select[aria-label='Filtrar por estado']")).sendKeys("Disponible");
  const fila = await visible(By.css("tr.fila-click"));
  const codigo = (await fila.getText()).match(/EQ-\d{4}/)[0];
  await fila.click();
  await pulsar("Eliminar");
  await esperarTexto("Esta acción no se puede deshacer");
  await pulsar("Sí, eliminar");
  await esperarTexto(`Equipo ${codigo} eliminado.`);
  await d.wait(async () => !(await d.findElement(By.css("body")).getText()).includes(`${codigo} ·`), ESPERA, "El equipo sigue en la lista");
});

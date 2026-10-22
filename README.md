# Winware 360 — Frontend

Portal web de Winware S.A.C.: inicio de sesión y registro (Amazon Cognito), y pantallas por rol conectadas a la API que ya desplegaste (API Gateway + Lambda + DynamoDB + Bedrock).

| Pantalla | Quién la ve | Qué hace |
|---|---|---|
| Resumen | Todos los roles | KPIs, avisos (marcar vista/resuelta), mapa de equipos, tickets recientes, contratos por vencer, compras por mes (solo Administrador y Administración) |
| Inventario | Todos | Lista con filtros y búsqueda, ficha del equipo, alta y edición, mantenimientos (Administrador y Técnico escriben) |
| Mesa de ayuda | Todos | Tablero por estado. **Nuevo ticket**: la persona escribe el problema, la IA lo clasifica y ella confirma o corrige. Cambiar estado, prioridad, asignación y comentar |
| Contratos | Todos | Contratos con uso de equipos y vencimiento, clientes, facturas del contrato (solo Administrador y Administración) |
| Finanzas | Administrador y Administración | Facturas (marcar pagada), órdenes de compra, proveedores |
| Usuarios | Administrador | Aprobar cuentas nuevas, asignar rol, desactivar/reactivar |

Los permisos se **validan en el servidor** (la API responde 403). El frontend solo oculta lo que no corresponde.

## 1. Probarlo en tu computadora

Requisitos: Node.js 20 o superior.

```powershell
cd winware-frontend
npm install
npm run dev
```

Abre http://localhost:3000. El archivo `.env.local` ya trae la URL de tu API y el ID del cliente de Cognito (no son secretos). Si cambias de entorno, copia `.env.local.example` y completa los valores de `sam deploy` → Outputs.

La API acepta por defecto solo el origen `http://localhost:3000` (parámetro `AllowedOrigin`). Si `npm run dev` usa otro puerto, el navegador mostrará un error de CORS: ajusta `AllowedOrigin` como se explica en el paso 3.

## 2. Compilar

```powershell
npm run typecheck   # revisa los tipos
npm run build       # genera la carpeta "out" (sitio estático)
```

Si `npm run build` muestra algún error, envíame el texto completo y lo corrijo.

### Pruebas de aceptación (Selenium)

```powershell
npm run test:aceptacion                    # compila, levanta el entorno local y corre las 12 pruebas en Microsoft Edge
npm run test:aceptacion -- --sin-compilar  # reutiliza la copia ya compilada (más rápido)
```

- No usan AWS: el script compila una copia del portal en `.aceptacion/` (la carpeta `out/` que se publica no se toca) y levanta `../winware-backend/scripts/servidor-local.ts`, que sirve el portal, la API real con datos de ejemplo en memoria y un Cognito simulado.
- Necesitan Microsoft Edge instalado. La primera vez, Selenium descarga solo el controlador de Edge (requiere internet).
- Los casos (PA-01 a PA-12) están en `pruebas-aceptacion/aceptacion.test.mjs`. Si alguno falla, se guarda una captura en `pruebas-aceptacion/capturas/`.
- El resultado queda en `pruebas-aceptacion/resultado.json`; `npm run informe` en el backend lo incluye en el Excel (hoja «Pruebas Aceptación»).
- Usuarios del entorno local: `gerencia@`, `tecnico1@` y `administracion@winware.example`, contraseña `Winware2026`. El código de verificación de correo siempre es `123456`.

## 3. Publicar en AWS Amplify Hosting

1. Consola de AWS → **AWS Amplify** → *Create new app* → *Deploy without Git* (subir un .zip). Comprime **el contenido** de la carpeta `out` (que `index.html` quede en la raíz del zip) y súbelo.
2. Amplify te da una URL como `https://main.xxxxxxxx.amplifyapp.com`.
3. Autoriza esa URL en la API (CORS). En la carpeta `backend`:

```powershell
$env:AWS_CLI_FILE_ENCODING="UTF-8"
sam deploy --parameter-overrides AllowedOrigin=https://main.xxxxxxxx.amplifyapp.com
```

Si ya activaste la IA, agrega el modelo en el mismo comando: `... AllowedOrigin=https://... ModelId=<id del modelo>`. Los parámetros que no repitas vuelven a su valor por defecto.

Para tener más de un origen (por ejemplo localhost y Amplify) hay que cambiar `AllowOrigins` en `template.yaml` a una lista; dímelo y lo ajusto.

### Alternativa: GitHub Pages
1. Sube la carpeta a un repositorio de GitHub (rama `main`). `.env.local` no se sube (está en `.gitignore`).
2. En el repositorio: **Settings → Pages → Source = GitHub Actions**.
3. En **Settings → Secrets and variables → Actions → Variables** crea `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_COGNITO_CLIENT_ID` y `NEXT_PUBLIC_COGNITO_REGION` (los mismos valores de `.env.local`).
4. Cada `git push` a `main` publica en `https://<usuario>.github.io/<repositorio>/` (flujo en `.github/workflows/pages.yml`).
5. Permite ese origen en el backend (solo el dominio, sin ruta ni `/` final): `sam deploy --parameter-overrides AllowedOrigin=https://<usuario>.github.io ModelId=<id>`. `localhost:3000` sigue permitido (`LocalOrigin`).
En local (`npm run dev`) no se usa `BASE_PATH`, así que todo funciona igual que antes en `http://localhost:3000`.

## 4. Primer uso

1. Crea el primer administrador con `scripts/primer-admin.ps1` del backend (ya lo hiciste).
2. Cualquier otra persona entra a **Crear cuenta**, confirma su correo con el código que Cognito le envía y queda **Pendiente**.
3. El Administrador entra a **Usuarios**, elige un rol y pulsa **Aprobar**.
4. La persona cierra sesión y vuelve a entrar (el rol viaja dentro del token de acceso, así que se actualiza al iniciar sesión de nuevo).

### Portal del cliente
En **Crear cuenta** hay dos opciones: *Soy cliente* (queda activo al entrar) y *Soy personal de Winware* (queda pendiente de aprobación). El cliente ve: **Catálogo** (detalle, IA, pedido y pago simulado con tarjeta/Yape/Plin), **Mis equipos** (garantía, modelo, condición, IA), **Mis contratos**, **Mis pagos** (boletas y facturas internas de ejemplo, imprimibles) y **Soporte**. Tarjeta de prueba: `4111 1111 1111 1111`, vence en el futuro, CVV `123`.
Cada equipo muestra su foto si el personal pegó un enlace https en **Inventario → Editar equipo → Foto del equipo**; si no hay foto (o el enlace falla), se muestra una ilustración según el tipo.
El personal completa marca, modelo, condición, garantía y características desde **Inventario → Editar equipo**.

## 5. Inteligencia artificial

Sin `ModelId`, el backend usa reglas simples para clasificar los tickets (el portal lo avisa como «Sugerencia automática»). Cuando tengas acceso a un modelo en Bedrock, despliega el backend con `ModelId=<id>` y el portal mostrará «Sugerencia de la IA» sin cambiar nada aquí.

## 6. Seguridad: lo que conviene saber

- El portal inicia sesión con `USER_PASSWORD_AUTH` directamente contra Cognito por HTTPS. Es sencillo y adecuado para un portal interno; el flujo con código de autorización (Hosted UI + PKCE) es más estricto y se puede migrar después.
- Los tokens se guardan en `localStorage` del navegador y se renuevan solos. Quien tenga acceso al navegador desbloqueado tiene la sesión; usa «Cerrar sesión» en equipos compartidos.
- No hay secretos en este proyecto: solo la URL de la API y el ID público del cliente de Cognito.
- Mantén la **MFA activada en la cuenta raíz** de AWS y **sin llaves de acceso**. Si alguna vez pegaste una llave en un chat, elimínala desde IAM.

## 7. Estructura

```
app/                 Pantallas (Next.js App Router)
  login/             Acceso, registro, confirmación, recuperar contraseña
  (app)/             Pantallas privadas: resumen, inventario, mesa-de-ayuda, contratos, finanzas, usuarios
components/          Piezas reutilizables (Drawer, formularios, tablero, mapa de equipos…)
lib/                 api.ts (llamadas), cognito.ts, sesion.ts, auth.tsx, tipos.ts, formato
```

Los detalles de equipos, tickets y contratos se abren en un panel lateral y la dirección queda en la URL (`/inventario?equipo=EQ-1001`), así que se pueden compartir enlaces.

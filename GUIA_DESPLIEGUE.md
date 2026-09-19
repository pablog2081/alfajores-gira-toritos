# Alfajores Gira Toritos — guía de instalación

Esta carpeta tiene el sitio nuevo (con tu logo y sin la interfaz de Google Forms) más el
"motor" que lo conecta a tus planillas de Google. Son 3 pasos, uno solo se hace una vez.

## Paso 1 — Instalar el Apps Script (el motor)

1. Abrí la planilla **"Panel Admin – Pedidos Alfajores Gira Toritos"**:
   https://docs.google.com/spreadsheets/d/1H0Pjs5UKF8sessxeOD8_lADLAVKKODnhc-xk7Z6QDs8/edit
2. Menú **Extensiones → Apps Script**.
3. Te va a abrir un editor con un archivo `Código.gs` casi vacío. Borrá todo lo que
   tenga adentro y pegá el contenido completo del archivo **`Code.gs`** que te dejé en esta carpeta.
4. La clave de administrador ya viene configurada como **`toritos2026`** (línea
   `var ADMIN_PASSWORD = 'toritos2026';`). Si preferís otra, cambiala ahí antes de
   implementar; si no, no hace falta tocar nada.
5. Guardá (ícono de disquete o Ctrl+S).
6. Arriba a la derecha, botón **Implementar → Nueva implementación**.
   - Hacé clic en el ícono de tuerca junto a "Seleccionar tipo" → elegí **Aplicación web**.
   - "Ejecutar como": **Yo (tu cuenta)**.
   - "Quién tiene acceso": **Cualquier usuario**.
   - Botón **Implementar**.
7. Te va a pedir autorizar permisos (es tu propio script pidiendo acceso a tus planillas
   y a Drive — es normal, aceptá).
8. Te va a dar una **URL de la aplicación web** (empieza con `https://script.google.com/macros/s/.../exec`).
   Copiala.

> Si en el futuro cambiás algo del código, tenés que volver a "Implementar" (podés usar
> "Administrar implementaciones" → el ícono de lápiz, para actualizar la misma URL en vez
> de crear una nueva).

## Paso 2 — Conectar el sitio con el Apps Script

1. Abrí el archivo **`config.js`** de esta carpeta con cualquier editor de texto (o el Bloc
   de notas).
2. Reemplazá `PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT` por la URL que copiaste en el paso 1,
   entre las comillas. Por ejemplo:
   ```
   const WEBAPP_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
3. Guardá el archivo.

Es el único archivo que hay que tocar — todas las páginas (`index.html`, `pedido.html`,
`comprobante.html`, `admin.html`) leen la URL de ahí.

## Paso 3 — Publicar el sitio en GitHub Pages (gratis)

1. Si no tenés cuenta, creá una en https://github.com (gratis).
2. Ya iniciada sesión, arriba a la derecha tocá el **+** → **New repository**.
   - Nombre: por ejemplo `alfajores-gira-toritos`.
   - Dejalo en **Public**.
   - Creá el repositorio (botón verde **Create repository**).
3. En la página del repositorio recién creado, buscá el link que dice
   **"uploading an existing file"** (o el botón **Add file → Upload files**).
4. Arrastrá ahí **todos los archivos de esta carpeta** (incluida la carpeta `assets` con
   el logo) — todo junto, no uno por uno en carpetas distintas.
5. Abajo, botón verde **Commit changes**.
6. Andá a la pestaña **Settings** del repositorio → en el menú de la izquierda, **Pages**.
7. En "Branch", elegí **main** (o **master**) y carpeta **/(root)** → **Save**.
8. Esperá un minuto y recargá esa misma pantalla — va a aparecer un cartel verde con el
   link de tu sitio, algo como:
   `https://tu-usuario.github.io/alfajores-gira-toritos/`

Ese es el link que le vas a compartir a las familias.

## Notas

- La clave de administrador es una clave compartida simple (como una clave de wifi):
  alcanza para que no entre cualquiera, pero no reemplaza un sistema de usuarios real.
  No la compartas más que con quien tenga que usar el panel.
- Los comprobantes que suban se guardan en una carpeta de tu Google Drive llamada
  **"Comprobantes Alfajores Gira Toritos"**, y quedan anotados en la pestaña
  **Comprobantes** de la planilla Panel Admin.
- Los pedidos quedan en la pestaña **Pedidos** de esa misma planilla (nueva, la crea el
  script solo la primera vez que se usa). Las pestañas viejas de Google Forms
  ("Respuestas de formulario 1", "Panel Admin") ya no se usan — las podés dejar o
  borrar, no importan más.
- Cuando una familia sube un comprobante, el pedido NO queda rendido automáticamente:
  pasa a "Por revisar" en el panel de administración, con un link para ver el
  comprobante. Un administrador tiene que revisarlo y tildar "Rendido" a mano para
  confirmarlo. Para un pago en efectivo (sin comprobante), el administrador puede
  tildar "Rendido" directamente en cualquier momento.
- Si ya habías probado una versión anterior de `Code.gs` y se llegó a crear la
  pestaña **Pedidos** con menos columnas, borrá esa pestaña (mientras no tenga pedidos
  reales todavía) para que el script la vuelva a crear con las columnas correctas la
  próxima vez que alguien haga un pedido.

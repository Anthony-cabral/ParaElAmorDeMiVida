# Un pequeño refugio para ti — versión final

Esta versión conserva el diseño visual del proyecto y reúne los cambios solicitados:

- MongoDB Atlas reemplaza SQLite para la persistencia.
- El catálogo se abre desde la URL normal, sin `#invite`.
- Las películas marcadas como vistas quedan guardadas en MongoDB y se recuperan al volver a entrar, incluso desde otro dispositivo.
- El botón **Empezar mi pequeña aventura** envía la notificación por Gmail.
- Un fallo de Gmail no bloquea futuros intentos.
- Los duplicados por doble clic/reintento inmediato se frenan durante un periodo corto.
- La música `golden-hour-piano.mp3`, suministrada para este proyecto, comienza después de una interacción del usuario y continúa durante las escenas.
- La carta fue reemplazada por la versión final aprobada.
- No se modificó el CSS ni la estructura visual del sitio.

## Variables de entorno

```dotenv
GMAIL_USER=tu_correo@gmail.com
GMAIL_APP_PASSWORD=tu_clave_de_aplicacion
NOTIFICATION_TO=tu_correo@gmail.com

MONGODB_URI=mongodb+srv://USUARIO:CLAVE@TU_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=ParaElAmorDeMiVida
MONGODB_COLLECTION=ParaElAmorDeMiVida
```

No subas un `.env` real a GitHub.

## Render

Configura:

```text
Build Command:
npm install && npm run vendor-assets

Start Command:
npm start
```

En **Environment** agrega:

```text
MONGODB_URI
MONGODB_DB=ParaElAmorDeMiVida
MONGODB_COLLECTION=ParaElAmorDeMiVida
GMAIL_USER
GMAIL_APP_PASSWORD
NOTIFICATION_TO
```

Render suministra `RENDER_EXTERNAL_URL` automáticamente.

## Imágenes y carteles

El ZIP conserva el mismo frontend. Los archivos visuales grandes se descargan durante el build desde el commit original exacto del proyecto:

`58e6e170a077b1fed4040f23252bbdcacda6b46b`

Esto evita perder las imágenes aunque después reemplaces el contenido de la rama `main`.

El servidor también tiene un fallback hacia ese mismo commit para las imágenes que falten.

## Música

El archivo está incluido en:

```text
public/assets/audio/golden-hour-piano.mp3
```

No hay controles visibles nuevos ni cambios de diseño. La música se inicia tras el clic del usuario porque los navegadores suelen bloquear reproducción automática sin interacción.

## Catálogo y progreso

Ya no existe una llave de invitación para abrir el catálogo. La aplicación crea una sesión normal automáticamente.

Los estados de las películas se guardan en:

```text
Database: ParaElAmorDeMiVida
Collection: ParaElAmorDeMiVida
```

Los documentos de progreso tienen `type: "progress"`.

## Migrar el progreso del SQLite anterior

Si quieres conservar lo que ya estaba marcado como visto:

```bash
npm run migrate:sqlite -- "RUTA/A/refugio.sqlite"
```

## Gmail

En Render Logs podrás ver:

```text
[notification] sent: Gmail aceptó el correo.
```

o, por ejemplo:

```text
[notification] failed: EAUTH/535
```

Nunca se imprimen la contraseña de Gmail ni el `MONGODB_URI`.

## Ejecutar localmente

```bash
npm install
npm run vendor-assets
npm start
```

# Un pequeño refugio para ti

Un regalo para la pareja de Anthony: bosque nocturno, luciérnagas que guardan mensajes, lago con ondas, carta, cine compartido y un ramo amarillo con «Continuará… · 21 de septiembre».

Proyecto funcional en **Node.js 24.14.0**, `node:http`, HTML, CSS y JavaScript puro. SQLite mediante `node:sqlite`; **cero dependencias de producción y ningún proceso de compilación**. Node 24 todavía muestra una advertencia experimental para SQLite: es esperada en la versión probada.

## Iniciar y abrir

Desde esta carpeta:

```sh
npm start
```

En otra terminal:

```sh
npm run invite
```

Abre el enlace que devuelve el segundo comando. **No basta con abrir localhost sin la invitación** la primera vez. El servidor crea automáticamente `private/refugio.sqlite`, un secreto aleatorio de 256 bits y el enlace de acceso. No hace falta `npm install`.

La vista previa local usa `http://localhost:3000`. Se dejó el servidor iniciado durante la entrega. El enlace privado también se guarda en `private/ABRIR-REFUGIO.txt` para esta entrega; ese archivo es local y no se sirve por HTTP.

## Personalizar

Edita **`public/js/config.js`**:

- `author`: Anthony.
- `partner`: por defecto «mi amor»; nunca aparece un campo pendiente.
- `letter`: los párrafos completos de la carta. `{author}` y `{partner}` se sustituyen automáticamente.
- `closingDate` y `closingTitle`: fecha y cierre.
- `entry`, `path`, `lake`, `cottage`, `cinema`, `garden`: mensajes del cuento.

Recarga el navegador para ver los cambios. Este archivo es público: no debe contener secretos. La fecha es un adelanto narrativo; no hay cuenta regresiva, desbloqueos ni promesas de entrega física. Se omitió el audio: no hay controles inactivos ni música de películas.

## Compartir entre ambos dispositivos

Ambos deben abrir **el mismo enlace de invitación, en el mismo servidor**. No copies el proyecto a dos servidores independientes: serían dos colecciones distintas.

En una misma red doméstica, configura `.env` a partir de `.env.example`:

```dotenv
HOST=0.0.0.0
PORT=3000
PUBLIC_ORIGIN=http://IP-LOCAL-DE-TU-PC:3000
NODE_ENV=development
```

Sustituye `IP-LOCAL-DE-TU-PC` por la IP real del equipo. Reinicia, vuelve a ejecutar `npm run invite` y abre ese enlace en los dos dispositivos. El cortafuegos debe permitir el puerto únicamente en la red privada. HTTP local es para pruebas; para compartir fuera de casa utiliza HTTPS.

Para publicarlo, hace falta un alojamiento que ejecute Node 24 y tenga **un volumen persistente**:

```dotenv
HOST=0.0.0.0
PORT=3000
PUBLIC_ORIGIN=https://TU-DOMINIO-REAL
NODE_ENV=production
PRIVATE_DIR=/ruta/absoluta/al/volumen/refugio
```

El dominio debe coincidir exactamente con el origen del navegador, sin barra final. Termina TLS en un proxy inverso y expón solo ese origen. El proceso rechaza producción con HTTP. No lo subas como una página estática ni a un sistema de archivos efímero. Está diseñado para **un proceso Node y una colección**; no para múltiples réplicas independientes.

**No está publicado en Internet en esta entrega.** La vista previa local y SQLite sí funcionan. Para enviar un enlace usable fuera de tu equipo falta alojar el servidor con HTTPS y almacenamiento persistente.

### Privacidad del enlace

- Cualquier persona que tenga la invitación puede leer y cambiar la colección. No identifica a tu pareja y no sustituye a las cuentas individuales.
- La invitación usa `#invite=…`; el fragmento no viaja en la petición HTTP ni aparece en los registros de acceso del servidor.
- El navegador lo intercambia mediante `POST /api/session` por una cookie `HttpOnly`, `SameSite=Strict`, de 30 días. En producción también es `Secure`. Después retira el fragmento de la URL visible.
- El token nunca está incrustado en JavaScript público. Su hash se valida en el servidor. El original queda **solo en `private/invitation-token.txt`** para poder volver a obtener la invitación. Protege esa carpeta con los permisos de tu sistema y no compartas sus copias.
- Sesiones y progreso se conservan tras reiniciar. Al caducar una sesión, vuelve a abrir la invitación original.
- Ningún recurso externo se carga durante el cuento o el catálogo. Las imágenes son locales. `Referrer-Policy: no-referrer` y `rel=noreferrer` protegen las salidas a fuentes oficiales.
- No hay analíticas, huellas digitales ni píxeles. El límite de acceso usa temporalmente un hash de la dirección de conexión en memoria; no se registra ni se guarda ubicación. No actives registros del cuerpo de peticiones en el proxy.
- Para revocar todo acceso: detén el servidor, reemplaza el secreto con uno aleatorio nuevo y vacía la tabla `sessions`; conserva `progress`. Haz una copia de seguridad antes de una intervención administrativa.

## Correo opcional

La integración usa la [API HTTPS de Resend](https://resend.com/docs/api-reference/emails/send-email), sin SDK ni dependencia adicional. Copia `.env.example` a `.env` y configura exclusivamente en el servidor:

```dotenv
RESEND_API_KEY=TU_CLAVE_PRIVADA
NOTIFY_TO=TU_CORREO
NOTIFY_FROM=Refugio <remitente@TU-DOMINIO-VERIFICADO>
```

Verifica el dominio remitente con el proveedor y desactiva cualquier seguimiento de apertura o clics en su configuración. El mensaje se envía como texto plano. Reinicia el servidor tras cambiar el entorno.

- Asunto: **Alguien empezó tu pequeña aventura 🌙**.
- Texto: **Alguien pulsó el botón de inicio de tu pequeño refugio.**
- Incluye fecha y hora de `America/Santo_Domingo`.
- Solo se intenta después del botón de inicio con el aviso visible y consentimiento explícito enviado al endpoint.
- «Entrar sin enviar aviso», cargar la página, visitar el catálogo, recargar y repetir capítulos no generan correos.
- Un intento por sesión, registrado en SQLite antes de contactar al proveedor. Los reintentos concurrentes no duplican ese intento; hay un intervalo global de seis horas entre avisos aceptados o en curso.
- La preferencia local evita intentarlo de nuevo desde el mismo navegador al repetir el cuento. Borrar cookies y almacenamiento equivale a una visita nueva; el intervalo global continúa protegiendo el envío.
- Si faltan credenciales, devuelve `disabled`; si falla el proveedor, `failed`. El cuento continúa. **No se simula un envío correcto**.
- No hay reenvío automático tras un fallo o una respuesta incierta; se prioriza evitar duplicados. Un intento sin credenciales consume ese intento de sesión. Para verificar la integración después de configurarla, utiliza una sesión nueva solo cuando quieras enviar un aviso real.

**No se enviaron correos reales durante el desarrollo ni las pruebas.** Se usó un transportador simulado exclusivamente dentro de las pruebas, sin claves ni destinatarios reales.

## Colección, datos e imágenes

Verificación de la filmografía: **19 de septiembre de 2026 (UTC)**, usando la [lista oficial de obras de Studio Ghibli](https://www.ghibli.jp/works/). El último largometraje listado es *El chico y la garza* (2023).

Se incluyen **25 historias**:

- 24 largometrajes producidos o coproducidos por el estudio, incluidos *Puedo escuchar el mar* (estreno televisivo, 1993), *Earwig y la bruja* (2020; estreno cinematográfico japonés en 2021) y *La tortuga roja* (coproducción, 2016).
- *Nausicaä del Valle del Viento* (Topcraft, 1984), identificado como **antecedente**, anterior a la fundación del estudio.
- Se excluyen *On Your Mark*, *Ghiblies episode 2*, los cortos del museo, series y películas de los directores fuera de esta colección.

`data/movies.json` conserva identificadores estables, títulos españoles e internacionales, años, direcciones, duraciones aproximadas oficiales, sinopsis breves redactadas para esta colección, categorías, fecha de comprobación, créditos y enlaces por película. Los títulos españoles pueden variar por territorio. No se incluyen enlaces de reproducción ni afirmaciones sobre plataformas.

`data/works-source.html` es la copia de referencia de la filmografía; `scripts/catalog-source.js` permite reproducir la extracción de datos a partir de ella. La ficha de [Ocean Waves en GKIDS](https://gkids.com/films/ocean-waves/) se consultó como referencia complementaria para duración y año.

### Carteles reales

Los 25 archivos de `public/assets/posters/` son los **carteles japoneses de las fichas oficiales**, descargados de las URLs realmente presentes en ellas, sin generar carteles ni inventar enlaces. `posterSource`, `dataSource` y `credit` identifican la fuente y los titulares para cada uno. Se muestran completos, sin deformarlos, con carga diferida y espacio reservado. Cada detalle muestra su atribución y enlaza la ficha.

La [nota del estudio sobre uso de imágenes](https://www.ghibli.jp/info/013344/) permite utilizar los fotogramas dentro de los límites del sentido común. **No es una licencia abierta general ni concede expresamente derechos de redistribución comercial de todos los carteles.** Esta entrega mantiene las imágenes en un proyecto personal para identificar películas; no se publicó una biblioteca de carteles ni se afirma que sean de dominio público. Antes de una publicación pública o comercial, confirma el permiso específico de los carteles con los titulares o sustituye esos archivos por material expresamente autorizado. Si un archivo deja de estar disponible, la tarjeta muestra el título y «Cartel no disponible», sin hacerlo pasar por cartel oficial.

### Ilustraciones originales

Cinco ilustraciones creadas con la herramienta integrada de generación de imágenes: bosque/sendero, lago, casita, cine y ramo en el jardín. Están en `public/assets/images/`, con originales PNG y versiones WebP optimizadas. No copian escenas ni personajes de las películas. El gato crema mantiene el pañuelo verde oliva y la flor amarilla entre escenas.

El ramo contiene tres girasoles, rosas abiertas y capullos, tres lirios, pequeñas flores amarillas, follaje, papel crema y lazo dorado. Se mantiene completo en móvil; el cierre y la fecha se colocan justo debajo para facilitar una captura. `data/art-prompts.json` documenta los prompts exactos y el uso de la herramienta integrada. Las fuentes de los carteles y las ilustraciones originales son distintas.

## Persistencia y copias de seguridad

`private/refugio.sqlite` guarda:

- `progress`: `movie_id`, `watched`, `updated_at`, `watched_at`.
- `sessions`: hash de sesión, token CSRF y caducidad.
- `notices`: sesión, momento del intento y estado del aviso.

`watched_at` es el momento de marcado, **no una afirmación sobre cuándo vieron la película**. Marcar otra vez el mismo estado no cambia esa fecha; desmarcar la borra. Las actualizaciones son explícitas e idempotentes. Si dos personas cambian la misma película, prevalece la última actualización recibida por el servidor. El catálogo se sincroniza al abrirlo y al recuperar visibilidad o foco; no hay sincronización continua.

Solo se confirma visualmente un cambio después de recibir éxito del servidor. Ante un fallo, se conserva el último estado conocido y aparece un reintento. Las preferencias de navegación usan `localStorage`; el progreso no.

Para una copia consistente mientras el servidor funciona:

```sh
npm run backup
```

El comando utiliza la API de copia de SQLite y escribe `private/backup-FECHA.sqlite`. Conserva también `access.json` y `invitation-token.txt` en una copia privada si quieres mantener la misma invitación. Para restaurar, detén Node, conserva una copia de los archivos actuales, reemplaza la base con el respaldo y retira los archivos WAL/SHM antiguos antes de reiniciar. Nunca copies solo el archivo principal de una base activa en modo WAL. El volumen debe sobrevivir a reinicios y despliegues.

## Seguridad y comprobaciones

El servidor solo sirve archivos de `public`, valida rutas reales para impedir traversal y enlaces simbólicos fuera del directorio, prohíbe que `PRIVATE_DIR` apunte dentro de `public`, aplica consultas parametrizadas y protege lecturas y escrituras del progreso. Las mutaciones requieren sesión, origen exacto y token CSRF. Hay límites de tamaño, tiempo y frecuencia. No se interpolan datos de películas en HTML.

```sh
npm test
```

Las pruebas automáticas del servidor verifican acceso privado, CSRF, entradas inválidas, rutas privadas inaccesibles, 25 películas con archivos locales, guardados idempotentes, desmarcado, persistencia tras reiniciar, dos sesiones, duplicados concurrentes y fallos/desactivación de correo.

`scripts/qa-browser.cjs` verifica el recorrido completo en Edge/Chromium de escritorio (1440 px) y móvil (390 px), luciérnagas, ondas, carta, Escape y devolución del foco, catálogo, filtros, búsqueda internacional, sugerencias solo pendientes, estado de todas vistas, recarga, dos sesiones, fallo 503 y reintento. Usa Playwright disponible en el entorno de desarrollo; no es una dependencia de producción. Para ejecutarlo en otro equipo, instala Playwright en el entorno de pruebas, habilita Edge o ajusta su canal y ejecuta `node scripts/qa-browser.cjs`.

Las capturas están en `test-output/` (excluido del repositorio). Se comprobaron imágenes decodificadas, ausencia de errores JavaScript, ancho sin desbordamientos y movimiento reducido. La prueba no sustituye una auditoría completa de accesibilidad ni una comprobación manual en Safari/iOS.

## Pendiente para compartir fuera del equipo

1. Alojamiento Node con HTTPS y volumen persistente, y el dominio real en `PUBLIC_ORIGIN`.
2. Credenciales, destinatario y remitente de correo, si deseas activar avisos.
3. Confirmar permisos de los carteles para una distribución pública; el proyecto actual se ha preparado como regalo personal.

No hay otras integraciones necesarias para ejecutar y explorar el regalo localmente.

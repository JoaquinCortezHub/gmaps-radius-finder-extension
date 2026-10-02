# Cerca en Maps para Firefox

WebExtension Manifest V3 para Firefox de escritorio 140+. Permite buscar categorías alrededor de una dirección, lugar o coordenadas mediante Maps URLs oficiales, sin backend ni API key.

## Desarrollo

Requisitos: Node.js 20+ y Firefox 140+.

```bash
npm install
npm test
npm run lint
npm start
```

También puede cargarse temporalmente desde `about:debugging` → “Este Firefox” → “Cargar complemento temporal…” seleccionando `manifest.json`. La instalación temporal desaparece al reiniciar Firefox.

## Uso

1. Ingresar una ubicación o abrir Google Maps y usar “Tomar de Google Maps”.
2. Si se tomaron las coordenadas del centro visible, revisar el mapa y marcar la confirmación.
3. Buscar una categoría individual o seleccionar varias y abrirlas en pestañas nuevas.
4. Administrar categorías y favoritos desde el engranaje.

Los enlaces cortos `maps.app.goo.gl` se abren para que Google resuelva la redirección. Después hay que volver a abrir el popup.

## Empaquetado y firma privada

```bash
npm run build
# Con WEB_EXT_API_KEY y WEB_EXT_API_SECRET ya cargadas de forma segura:
npm run sign
```

Los artefactos (`.zip` y `.xpi`) se guardan en el directorio hermano `../cerca-en-maps-artifacts`, fuera del código fuente.

No guardar credenciales de AMO en archivos ni en el historial del shell. El ID estable es `cerca-en-maps@local.jhaycortez`; cada nueva firma debe incrementar la versión semántica de `manifest.json`. El `.xpi` firmado se instala desde `about:addons` y sus actualizaciones son manuales.

## Privacidad y permisos

Solo solicita `activeTab`, `scripting` y `storage`. No solicita geolocalización ni acceso global a sitios. Consultar [PRIVACY.md](PRIVACY.md) para la declaración de transmisión a Google Maps.

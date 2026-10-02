# Privacidad de Cerca en Maps

Cerca en Maps no usa backend, analytics, geolocalización del dispositivo ni servicios propios. La configuración, los favoritos y la última ubicación se guardan localmente mediante `browser.storage.local`.

La extensión transmite directamente a Google Maps los siguientes datos únicamente cuando la persona inicia una búsqueda:

- `locationInfo`: la ubicación escrita, elegida o tomada del mapa.
- `searchTerms`: la categoría elegida y la frase de búsqueda resultante.

La transmisión ocurre al navegar explícitamente a una URL oficial de Google Maps. La extensión no realiza solicitudes de red en segundo plano y no comparte datos con ningún otro tercero.

Los datos locales pueden eliminarse de forma individual o completa desde la extensión. Al desinstalarla, Firefox elimina su almacenamiento local.

# Mi Discografía

Aplicación web instalable para iPhone que permite escanear códigos de barras y catalogar discos.

## Publicar con GitHub Pages

1. Sube todos estos archivos a la raíz del repositorio.
2. Abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama **main** y la carpeta **/(root)**.
5. Guarda y abre la dirección que mostrará GitHub Pages.

Los discos se guardan en el propio dispositivo mediante almacenamiento local.


## Discogs
La búsqueda por código de barras se realiza mediante la Edge Function `buscar-discogs` de Supabase. El token personal de Discogs permanece guardado como secreto `DISCOGS_TOKEN` en Supabase y no se incluye en el repositorio.

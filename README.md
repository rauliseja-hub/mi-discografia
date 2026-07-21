# Mi Discografía

Aplicación web instalable para iPhone. Conserva la búsqueda original de códigos con MusicBrainz y, al guardar, añade la edición elegida a la colección personal de Discogs.

## Archivos web

Sube a la raíz de GitHub Pages: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js` y la carpeta `icons`.

## Función de Supabase

Crea una Edge Function llamada `anadir-discogs` y pega el contenido de `supabase/anadir-discogs/index.ts`. Debe tener acceso al secreto `DISCOGS_TOKEN`. Desactiva `Verify JWT` para esta función.

Los discos siguen guardándose localmente en el dispositivo. La sincronización con Discogs se ejecuta después de guardar cada ficha.

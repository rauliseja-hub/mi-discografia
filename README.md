# Mi Discografía — versión alfabética con precios

- Escáner EAN/UPC con cámara.
- Búsqueda de datos mediante MusicBrainz.
- Orden alfabético por artista y título.
- Precio orientativo obtenido de Discogs.
- Botón para actualizar los precios de toda la colección.

## Supabase
Crear una Edge Function llamada `precio-discogs` con el contenido de `supabase/precio-discogs/index.ts`.
Debe existir el secreto `DISCOGS_TOKEN`. Desactivar `Verify JWT` en esta función.

El precio mostrado es el menor precio anunciado actualmente para la edición localizada en Discogs. No incluye necesariamente gastos de envío y no garantiza el precio final de venta.

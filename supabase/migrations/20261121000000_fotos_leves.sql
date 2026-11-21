-- Fotos agora são reduzidas e comprimidas (WebP) no navegador antes do envio:
-- peça ~1280 px + miniatura 480 px, capa 1600 px, logo 512 px. Nada legítimo passa de 2 MB.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
 where id = 'fotos';

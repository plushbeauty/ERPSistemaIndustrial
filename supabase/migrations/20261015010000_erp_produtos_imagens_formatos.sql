-- Amplia os formatos aceitos para fotos do cadastro de produtos.
-- Mantém o bucket público, o limite de 5 MB e as políticas de isolamento por empresa.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/x-ms-bmp',
  'image/gif',
  'image/avif',
  'image/tiff'
]
where id = 'erp-produtos';

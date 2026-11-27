insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('pedidos-origem','pedidos-origem',false,52428800,
 array['message/rfc822','application/vnd.ms-outlook','application/pdf','image/png','image/jpeg','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
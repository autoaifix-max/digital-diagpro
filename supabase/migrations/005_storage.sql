-- 005: Private customer document storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents',
  'customer-documents',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {workshop_id}/{customer_id}/{uuid}-{safe_filename}
create policy "staff upload customer documents"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "staff read own workshop documents"
on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "staff update own workshop documents"
on storage.objects
for update to authenticated
using (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
)
with check (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "admins delete own workshop documents"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'customer-documents'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "customers read visible document files"
on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-documents'
  and exists (
    select 1
    from public.customer_documents d
    where d.storage_path = name
      and d.customer_id = public.current_customer_id()
      and d.customer_visible = true
  )
);

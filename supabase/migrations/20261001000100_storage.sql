-- =====================================================================
-- Storage: fotografias e documentos (privados)
-- Caminho dos ficheiros: visitas/{visita_id}/{ficheiro}
-- O acesso segue as mesmas regras da visita.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos',      'fotos',      false, 5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('documentos', 'documentos', false, 10485760, array['application/pdf', 'image/png'])
on conflict (id) do nothing;

create or replace function public.visita_do_caminho(caminho text)
returns uuid language plpgsql immutable as $$
declare
  partes text[] := string_to_array(caminho, '/');
begin
  if array_length(partes, 1) < 3 or partes[1] <> 'visitas' then
    return null;
  end if;
  return partes[2]::uuid;
exception when invalid_text_representation then
  return null;
end $$;

create policy ficheiros_ler on storage.objects for select to authenticated
  using (bucket_id in ('fotos', 'documentos')
         and public.pode_ver_visita(public.visita_do_caminho(name)));

create policy ficheiros_enviar on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos', 'documentos')
              and public.pode_ver_visita(public.visita_do_caminho(name)));

-- Fotografias podem ser substituídas; documentos nunca (um PDF assinado não muda).
create policy fotos_substituir on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.pode_ver_visita(public.visita_do_caminho(name)));

create policy ficheiros_apagar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'documentos') and public.eh_gestor());

-- ============================================================
-- PILOT — Policies du bucket Storage "documents"
-- ------------------------------------------------------------
-- À exécuter une seule fois dans le SQL Editor de Supabase.
-- Nécessaire pour que l'upload de la photo de profil fonctionne :
-- sans ces policies, RLS bloque tout par défaut sur storage.objects,
-- exactement comme sur les autres tables.
--
-- Principe : chaque fichier est rangé sous un dossier nommé par
-- l'UUID de l'utilisateur (ex. "abc123.../photo-profil.jpg").
-- storage.foldername(name) retourne ce premier segment de chemin —
-- on vérifie qu'il correspond à auth.uid(), exactement comme
-- user_id = auth.uid() sur les autres tables.
-- ============================================================

create policy "Chacun lit sa propre photo"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun envoie sa propre photo"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun met à jour sa propre photo"
  on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun supprime sa propre photo"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

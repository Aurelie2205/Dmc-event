-- ============================================================
-- PILOT — Ajout du code APE/NAF et du taux de charges sociales
-- ------------------------------------------------------------
-- À exécuter une seule fois dans le SQL Editor de Supabase.
--
-- taux_charges_sociales : un pourcentage AJUSTABLE par l'utilisatrice
-- (Mon espace), jamais un chiffre officiel gravé dans le code — les
-- taux réels URSSAF varient selon le statut exact, les seuils de
-- revenus, l'ACRE éventuelle, etc. PILOT propose une valeur de départ
-- raisonnable (45%) mais ne prétend jamais connaître le taux exact
-- applicable à une situation donnée.
-- ============================================================

alter table public.profils_entreprise
  add column if not exists code_ape text,
  add column if not exists taux_charges_sociales numeric not null default 45;

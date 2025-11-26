-- Script pour nettoyer les sessions actives
-- Exécuter avec : psql -U tir_arc_user -d terrain_tir_arc -f clear-active-sessions.sql

BEGIN;

-- Afficher le nombre de sessions actives avant
SELECT COUNT(*) as "Sessions actives avant" FROM sessions WHERE active = true;

-- Option 1 : Terminer toutes les sessions actives (recommandé - conserve l'historique)
UPDATE sessions
SET active = false,
    date_fin = NOW(),
    updated_at = NOW()
WHERE active = true;

-- Option 2 : Supprimer TOUTES les sessions (décommenter si vous voulez tout effacer)
-- DELETE FROM sessions;

-- Afficher le résultat
SELECT COUNT(*) as "Sessions actives après" FROM sessions WHERE active = true;
SELECT COUNT(*) as "Total sessions dans l'historique" FROM sessions;

COMMIT;

SELECT '✅ Nettoyage terminé!' AS status;

-- ============================================================
-- Remove the CuedUp rating feature.
-- ⚠️ DESTRUCTIVE & PERMANENT — this deletes all rating data.
--    Run only after you've decided to drop the feature for good.
--    (Optional safety: back it up first, see the commented line below.)
-- ============================================================

-- Optional backup before dropping:
-- create table movie_ratings_backup as table public.movie_ratings;

drop table if exists public.movie_ratings;

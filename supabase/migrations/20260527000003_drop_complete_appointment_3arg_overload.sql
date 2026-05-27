-- The previous migration added p_extras with CREATE OR REPLACE, which only
-- matches the exact signature — so the prior 3-arg overload was left in place
-- and PostgREST started returning PGRST203 ("could not choose the best
-- candidate"). Drop the stale overload so only the 4-arg version remains.
DROP FUNCTION IF EXISTS public.complete_appointment(uuid, uuid, numeric);

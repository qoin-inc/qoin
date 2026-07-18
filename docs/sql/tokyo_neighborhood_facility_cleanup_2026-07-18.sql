-- Remove the legacy facility reservation data requested for 東京町内会.
-- Reservations are removed first because historical rows can remain after the
-- facility master has already been deleted.

DO $$
DECLARE
  target_neighborhood_id BIGINT;
BEGIN
  SELECT id INTO target_neighborhood_id
  FROM public.neighborhoods
  WHERE name = '東京町内会'
  LIMIT 1;

  IF target_neighborhood_id IS NULL THEN
    RAISE EXCEPTION '東京町内会が見つかりません。';
  END IF;

  DELETE FROM public.facility_reservations
  WHERE neighborhood_id = target_neighborhood_id;

  DELETE FROM public.facilities
  WHERE neighborhood_id = target_neighborhood_id;
END;
$$;

SELECT
  (SELECT count(*) FROM public.facilities facility
    JOIN public.neighborhoods neighborhood ON neighborhood.id = facility.neighborhood_id
    WHERE neighborhood.name = '東京町内会') AS facilities_remaining,
  (SELECT count(*) FROM public.facility_reservations reservation
    JOIN public.neighborhoods neighborhood ON neighborhood.id = reservation.neighborhood_id
    WHERE neighborhood.name = '東京町内会') AS reservations_remaining;

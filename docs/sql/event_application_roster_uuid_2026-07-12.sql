-- resident_rosters.id はUUIDのため、イベント返信の名簿IDも文字列で保持する。
-- 既存の数値IDは文字列へ安全に変換される。

ALTER TABLE public.event_applications
  ALTER COLUMN roster_id TYPE TEXT
  USING roster_id::TEXT;

COMMENT ON COLUMN public.event_applications.roster_id IS
  'resident_rosters.id。UUIDおよび旧数値IDとの互換性のためTEXTで保持する。';

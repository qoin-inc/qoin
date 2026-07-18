-- 2026-07-19
-- Stripe会費決済の総額・手数料・差引額を分離し、支払手数料へ自動計上する。

INSERT INTO public.assembly_standard_categories (type, name, sort_order, is_active)
VALUES ('expense', '支払手数料', 180, TRUE)
ON CONFLICT (type, name) DO UPDATE
SET sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

UPDATE public.assembly_standard_categories
SET sort_order = 190,
    updated_at = NOW()
WHERE type = 'expense'
  AND name = '予備費'
  AND sort_order <= 180;

ALTER TABLE public.fee_records
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_fee_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_net_amount INTEGER DEFAULT 0;

ALTER TABLE public.assembly_settlements
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS assembly_settlements_external_source_unique
  ON public.assembly_settlements (neighborhood_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

COMMENT ON COLUMN public.fee_records.stripe_balance_transaction_id IS 'Stripe残高取引ID。手数料・差引額の照合に使用する。';
COMMENT ON COLUMN public.fee_records.stripe_fee_amount IS 'Stripeが残高取引で控除した実手数料。';
COMMENT ON COLUMN public.fee_records.stripe_net_amount IS 'Stripe決済総額から手数料を控除した差引額。';
COMMENT ON COLUMN public.assembly_settlements.source_type IS '自動計上元の種類。Stripe手数料はstripe_fee。';
COMMENT ON COLUMN public.assembly_settlements.source_id IS '自動計上元の一意ID。Stripe手数料は残高取引ID。';

SELECT type, name, sort_order, is_active
FROM public.assembly_standard_categories
WHERE type = 'expense' AND name IN ('支払手数料', '予備費')
ORDER BY sort_order;

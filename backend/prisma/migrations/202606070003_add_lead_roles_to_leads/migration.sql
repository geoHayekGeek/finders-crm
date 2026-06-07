-- Add explicit buyer/seller role flags to leads.
-- Existing leads are backfilled from property ownership/buyer relations.

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN NOT NULL DEFAULT FALSE;

WITH lead_role_counts AS (
  SELECT
    l.id,
    COALESCE(owner_counts.owner_count, 0) AS owner_count,
    COALESCE(buyer_counts.buyer_count, 0) AS buyer_count
  FROM leads l
  LEFT JOIN (
    SELECT owner_id, COUNT(*) AS owner_count
    FROM properties
    WHERE owner_id IS NOT NULL
    GROUP BY owner_id
  ) owner_counts ON owner_counts.owner_id = l.id
  LEFT JOIN (
    SELECT buyer_id, COUNT(*) AS buyer_count
    FROM properties
    WHERE buyer_id IS NOT NULL
    GROUP BY buyer_id
  ) buyer_counts ON buyer_counts.buyer_id = l.id
)
UPDATE leads l
SET
  is_buyer = CASE
    WHEN lead_role_counts.buyer_count > 0 THEN TRUE
    WHEN lead_role_counts.owner_count = 0 AND lead_role_counts.buyer_count = 0 THEN TRUE
    ELSE FALSE
  END,
  is_seller = CASE
    WHEN lead_role_counts.owner_count > 0 THEN TRUE
    ELSE FALSE
  END
FROM lead_role_counts
WHERE l.id = lead_role_counts.id;

CREATE INDEX IF NOT EXISTS idx_leads_is_buyer ON leads(is_buyer);
CREATE INDEX IF NOT EXISTS idx_leads_is_seller ON leads(is_seller);

COMMENT ON COLUMN leads.is_buyer IS 'Marks leads that are buyers. Leads can be buyer, seller, or both.';
COMMENT ON COLUMN leads.is_seller IS 'Marks leads that are sellers. Leads can be buyer, seller, or both.';

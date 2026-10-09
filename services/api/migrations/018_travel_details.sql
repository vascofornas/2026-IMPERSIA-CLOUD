CREATE TABLE IF NOT EXISTS travel_item_details (
    item_id uuid PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
    travel_subtype text,
    travel_starts_at timestamptz,
    travel_ends_at timestamptz,
    travel_provider text,
    travel_reference text,
    travel_address text,
    travel_contact_name text,
    travel_contact_phone text,
    travel_contact_email text,
    travel_booking_status text,
    travel_amount numeric(12, 2),
    travel_currency text,
    travel_payment_status text,
    travel_quantity integer,
    travel_url text,
    travel_notes text,
    travel_budget numeric(12, 2),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (travel_amount IS NULL OR travel_amount >= 0),
    CHECK (travel_budget IS NULL OR travel_budget >= 0),
    CHECK (travel_quantity IS NULL OR travel_quantity > 0),
    CHECK (travel_currency IS NULL OR char_length(travel_currency) = 3)
);

CREATE INDEX IF NOT EXISTS travel_item_details_starts_at
    ON travel_item_details (travel_starts_at)
    WHERE travel_starts_at IS NOT NULL;

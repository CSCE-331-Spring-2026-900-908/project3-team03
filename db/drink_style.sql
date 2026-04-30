CREATE TABLE IF NOT EXISTS drink_style (
    drink TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    lid_color TEXT NOT NULL,
    straw_main TEXT NOT NULL,
    straw_shadow TEXT NOT NULL,
    liquid_top TEXT NOT NULL,
    liquid_mid TEXT NOT NULL,
    liquid_bottom TEXT NOT NULL,
    accent_type TEXT NOT NULL DEFAULT 'none',
    accent_color TEXT NOT NULL DEFAULT '#000000',
    boba_color TEXT NOT NULL DEFAULT '#1A0F0B',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

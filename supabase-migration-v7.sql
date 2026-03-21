-- Migration v7: Add gender field for student eligibility-aware matching

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_gender_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_gender_check
        CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say'));
    END IF;
END $$;

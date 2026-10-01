-- =========================================================
-- PromptG: Supabase Database & Storage Setup
-- Run this script in your Supabase Project -> SQL Editor
-- =========================================================

-- 1. Create Prompts Table
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    labels TEXT[] DEFAULT '{}',
    rating NUMERIC DEFAULT 4.8,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) and public read/write policy
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on prompts"
    ON public.prompts FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on prompts"
    ON public.prompts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on prompts"
    ON public.prompts FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on prompts"
    ON public.prompts FOR DELETE
    USING (true);

-- 3. Enable Realtime on the prompts table for instant Laptop + Mobile sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.prompts;

-- 4. Create Public Storage Bucket for Images (1+2+3 multi-image uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prompt-images', 'prompt-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for prompt-images
CREATE POLICY "Public image access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'prompt-images');

CREATE POLICY "Public image upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'prompt-images');

CREATE POLICY "Public image delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'prompt-images');

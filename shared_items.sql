-- Run this script in the Supabase SQL Editor to support persistent cloud-synced sharing of files and folders

CREATE TABLE IF NOT EXISTS public.shared_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  sender_name TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'file' or 'folder'
  title TEXT NOT NULL,
  files JSONB NOT NULL, -- Array of { name: string, code: string, format?: 'terminal' | 'cell' }
  file_count INTEGER NOT NULL DEFAULT 1
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous guest) to read shared materials
CREATE POLICY "Anyone can view shared items" 
  ON public.shared_items FOR SELECT 
  USING (true);

-- Allow anyone to create shared items
CREATE POLICY "Anyone can insert shared items" 
  ON public.shared_items FOR INSERT 
  WITH CHECK (true);

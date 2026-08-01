-- Run this script in the Supabase SQL Editor to support cloud-synced file saving

CREATE TABLE IF NOT EXISTS public.saved_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_scripts ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies so users can only manage their own scripts
CREATE POLICY "Users can insert their own scripts" 
  ON public.saved_scripts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own scripts" 
  ON public.saved_scripts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own scripts" 
  ON public.saved_scripts FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scripts" 
  ON public.saved_scripts FOR DELETE 
  USING (auth.uid() = user_id);

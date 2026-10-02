ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interaction_priorities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interaction_notes TEXT;
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_category_check;
ALTER TABLE public.memories ADD CONSTRAINT memories_category_check CHECK (category IN ('important_event','conversation_preference','personal_context','emotional_pattern','goal','ongoing_project'));
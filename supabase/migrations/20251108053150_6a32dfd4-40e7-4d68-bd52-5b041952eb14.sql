-- Add new columns to game_stats table
ALTER TABLE public.game_stats 
ADD COLUMN IF NOT EXISTS total_moves integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_game_time integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS powerups_available integer NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS powerups_used integer NOT NULL DEFAULT 0;

-- Create daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date date NOT NULL UNIQUE,
  challenge_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  target_value integer NOT NULL,
  reward_type text NOT NULL,
  reward_value text NOT NULL,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily challenges"
ON public.daily_challenges
FOR SELECT
USING (true);

-- Create user_challenge_progress table
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge progress"
ON public.user_challenge_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
ON public.user_challenge_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
ON public.user_challenge_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create theme_definitions table
CREATE TABLE IF NOT EXISTS public.theme_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  grid_color text NOT NULL,
  x_color text NOT NULL,
  o_color text NOT NULL,
  background_color text NOT NULL,
  unlock_requirement_type text,
  unlock_requirement_value text,
  is_premium boolean NOT NULL DEFAULT false,
  preview_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view theme definitions"
ON public.theme_definitions
FOR SELECT
USING (true);

-- Create user_themes table
CREATE TABLE IF NOT EXISTS public.user_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  active_theme_id uuid REFERENCES public.theme_definitions(id),
  unlocked_themes uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own themes"
ON public.user_themes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own themes"
ON public.user_themes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own themes"
ON public.user_themes
FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_referrals table
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
ON public.user_referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert own referrals"
ON public.user_referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Anyone can update referrals by code"
ON public.user_referrals
FOR UPDATE
USING (true);

-- Create premium_trials table
CREATE TABLE IF NOT EXISTS public.premium_trials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  trial_start_date timestamp with time zone NOT NULL DEFAULT now(),
  trial_end_date timestamp with time zone NOT NULL,
  trial_source text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trials"
ON public.premium_trials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trials"
ON public.premium_trials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default themes
INSERT INTO public.theme_definitions (name, grid_color, x_color, o_color, background_color, unlock_requirement_type, unlock_requirement_value, is_premium) VALUES
('Classic', '#9b87f5', '#D946EF', '#8B5CF6', '#1A1F2C', null, null, false),
('Ocean Blue', '#0EA5E9', '#06B6D4', '#0284C7', '#0F172A', 'achievement', 'water_master', false),
('Forest Green', '#22C55E', '#84CC16', '#16A34A', '#18181B', 'achievement', 'nature_lover', false),
('Sunset', '#F97316', '#EF4444', '#A855F7', '#292524', 'games_played', '50', false),
('Neon', '#EC4899', '#F59E0B', '#10B981', '#18181B', 'games_played', '100', false),
('Dark Mode', '#64748B', '#94A3B8', '#475569', '#0F172A', null, null, false),
('Light Mode', '#6366F1', '#8B5CF6', '#A855F7', '#F8FAFC', null, null, false),
('Gold Rush', '#FBBF24', '#F59E0B', '#D97706', '#1C1917', null, null, true),
('Ruby Red', '#DC2626', '#EF4444', '#F87171', '#1F1D1D', null, null, true),
('Emerald', '#059669', '#10B981', '#34D399', '#14151A', null, null, true),
('Diamond', '#E0E7FF', '#C7D2FE', '#A5B4FC', '#111827', null, null, true)
ON CONFLICT (name) DO NOTHING;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_stats_best_streak ON public.game_stats(best_streak DESC);

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_stats;
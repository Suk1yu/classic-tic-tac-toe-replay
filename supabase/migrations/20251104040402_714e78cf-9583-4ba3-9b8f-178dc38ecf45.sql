-- Drop existing achievements table
DROP TABLE IF EXISTS public.achievements CASCADE;

-- Create achievement_definitions table
CREATE TABLE public.achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_type TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_achievements table to track unlocks
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for achievement_definitions (everyone can view)
CREATE POLICY "Anyone can view achievement definitions"
ON public.achievement_definitions
FOR SELECT
USING (true);

-- RLS policies for user_achievements
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert predefined achievements
INSERT INTO public.achievement_definitions (achievement_type, title, description, is_premium, icon) VALUES
('first_win', 'Kemenangan Pertama', 'Menangkan game pertama kamu', false, '🏆'),
('win_streak_3', 'Hat-trick', 'Menang 3 kali berturut-turut', false, '🔥'),
('win_streak_5', 'Dominator', 'Menang 5 kali berturut-turut', false, '⚡'),
('win_streak_10', 'Unstoppable', 'Menang 10 kali berturut-turut', true, '👑'),
('games_10', 'Pemula', 'Mainkan 10 game', false, '🎮'),
('games_50', 'Berpengalaman', 'Mainkan 50 game', false, '🎯'),
('games_100', 'Veteran', 'Mainkan 100 game', true, '💎'),
('total_wins_10', 'Pemenang', 'Raih 10 kemenangan', false, '🥇'),
('total_wins_25', 'Juara', 'Raih 25 kemenangan', false, '🏅'),
('total_wins_50', 'Legend', 'Raih 50 kemenangan', true, '⭐'),
('perfect_game', 'Perfect', 'Menang tanpa menggunakan undo', true, '💯'),
('comeback_king', 'Comeback King', 'Menang setelah sempat tertinggal', false, '🦸'),
('fast_win', 'Lightning Fast', 'Menang dalam waktu kurang dari 1 menit', false, '⚡'),
('draw_master', 'Draw Master', 'Dapatkan 10 draw', false, '🤝');
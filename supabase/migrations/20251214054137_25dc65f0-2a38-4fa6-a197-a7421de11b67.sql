-- Add RLS policy to allow anyone (including non-logged-in users) to view game_stats for leaderboard
CREATE POLICY "Anyone can view game stats for leaderboard"
ON public.game_stats
FOR SELECT
USING (true);

-- Add RLS policy to allow anyone to view profiles for leaderboard
CREATE POLICY "Anyone can view profiles for leaderboard"
ON public.profiles
FOR SELECT
USING (true);

-- Add RLS policy to allow anyone to view user_roles for leaderboard (to check premium status)
CREATE POLICY "Anyone can view user roles for leaderboard"
ON public.user_roles
FOR SELECT
USING (true);
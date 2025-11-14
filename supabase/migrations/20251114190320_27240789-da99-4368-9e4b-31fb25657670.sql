-- Fix RLS policies for leaderboard to show all users
-- Allow authenticated users to view all profiles (read-only)
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to view all game stats for leaderboard
CREATE POLICY "Authenticated users can view all stats" 
ON public.game_stats 
FOR SELECT 
TO authenticated
USING (true);
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GameStats {
  wins: number;
  total_games: number;
  current_streak: number;
  draws: number;
  undo_used: number;
}

export const checkAndUnlockAchievements = async (
  userId: string,
  stats: GameStats,
  gameData?: {
    won: boolean;
    usedUndo: boolean;
    gameDuration?: number;
  }
) => {
  const achievementsToCheck: string[] = [];

  // Check wins-based achievements
  if (stats.wins === 1) achievementsToCheck.push("first_win");
  if (stats.wins === 10) achievementsToCheck.push("total_wins_10");
  if (stats.wins === 25) achievementsToCheck.push("total_wins_25");
  if (stats.wins === 50) achievementsToCheck.push("total_wins_50");

  // Check streak achievements
  if (stats.current_streak === 3) achievementsToCheck.push("win_streak_3");
  if (stats.current_streak === 5) achievementsToCheck.push("win_streak_5");
  if (stats.current_streak === 10) achievementsToCheck.push("win_streak_10");

  // Check total games achievements
  if (stats.total_games === 10) achievementsToCheck.push("games_10");
  if (stats.total_games === 50) achievementsToCheck.push("games_50");
  if (stats.total_games === 100) achievementsToCheck.push("games_100");

  // Check draw achievements
  if (stats.draws === 10) achievementsToCheck.push("draw_master");

  // Check game-specific achievements
  if (gameData) {
    if (gameData.won && !gameData.usedUndo) {
      achievementsToCheck.push("perfect_game");
    }
    if (gameData.gameDuration && gameData.gameDuration < 60 && gameData.won) {
      achievementsToCheck.push("fast_win");
    }
  }

  // Check if user is premium for premium achievements
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "premium");

  const isPremium = roles && roles.length > 0;

  // Fetch achievement definitions to check premium status
  const { data: definitions } = await supabase
    .from("achievement_definitions")
    .select("achievement_type, is_premium, title, icon")
    .in("achievement_type", achievementsToCheck);

  if (!definitions) return;

  // Filter out premium achievements if user is not premium
  const validAchievements = definitions.filter(
    def => !def.is_premium || isPremium
  );

  // Check which achievements are already unlocked
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_type")
    .eq("user_id", userId)
    .in("achievement_type", validAchievements.map(a => a.achievement_type));

  const unlockedTypes = new Set(unlocked?.map(u => u.achievement_type) || []);

  // Unlock new achievements
  const newAchievements = validAchievements.filter(
    def => !unlockedTypes.has(def.achievement_type)
  );

  for (const achievement of newAchievements) {
    const { error } = await supabase
      .from("user_achievements")
      .insert({
        user_id: userId,
        achievement_type: achievement.achievement_type
      });

    if (!error) {
      toast.success(
        `🎉 Achievement Unlocked: ${achievement.icon} ${achievement.title}!`,
        { duration: 3000 }
      );
    }
  }
};

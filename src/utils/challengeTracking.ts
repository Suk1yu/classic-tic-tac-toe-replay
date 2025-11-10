import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const trackChallengeProgress = async (
  userId: string,
  gameResult: {
    won: boolean;
    usedUndo: boolean;
    streak: number;
    isPerfectGame: boolean;
  }
) => {
  try {
    // Get today's challenges
    const today = new Date().toISOString().split('T')[0];
    
    const { data: challenges } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", today);

    if (!challenges || challenges.length === 0) return;

    // Get user's progress for today's challenges
    const { data: userProgress } = await supabase
      .from("user_challenge_progress")
      .select("*")
      .eq("user_id", userId)
      .in("challenge_id", challenges.map(c => c.id));

    const progressMap = new Map(userProgress?.map(p => [p.challenge_id, p]) || []);

    for (const challenge of challenges) {
      const currentProgress = progressMap.get(challenge.id);
      let newProgress = currentProgress?.progress || 0;
      let shouldUpdate = false;

      // Update progress based on challenge type
      switch (challenge.challenge_type) {
        case "daily_wins_3":
        case "daily_wins_5":
          if (gameResult.won) {
            newProgress++;
            shouldUpdate = true;
          }
          break;
        
        case "daily_no_undo":
          if (gameResult.won && !gameResult.usedUndo) {
            newProgress++;
            shouldUpdate = true;
          }
          break;
        
        case "daily_streak":
          if (gameResult.streak >= challenge.target_value) {
            newProgress = challenge.target_value;
            shouldUpdate = true;
          }
          break;
        
        case "daily_perfect_games":
          if (gameResult.isPerfectGame) {
            newProgress++;
            shouldUpdate = true;
          }
          break;
      }

      if (shouldUpdate) {
        const completed = newProgress >= challenge.target_value;
        
        if (currentProgress) {
          // Update existing progress
          await supabase
            .from("user_challenge_progress")
            .update({
              progress: newProgress,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            })
            .eq("id", currentProgress.id);
        } else {
          // Insert new progress
          await supabase
            .from("user_challenge_progress")
            .insert({
              user_id: userId,
              challenge_id: challenge.id,
              progress: newProgress,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            });
        }

        if (completed && !currentProgress?.completed) {
          toast.success(`🎉 Challenge Completed: ${challenge.title}!`, {
            description: `Reward: ${challenge.reward_value}`,
            duration: 5000,
          });
        } else if (newProgress > (currentProgress?.progress || 0)) {
          toast.info(`Challenge Progress: ${newProgress}/${challenge.target_value}`, {
            description: challenge.title,
            duration: 2000,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error tracking challenge progress:", error);
  }
};

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AchievementCardProps {
  achievement: {
    achievement_type: string;
    title: string;
    description: string;
    is_premium: boolean;
    icon: string;
    unlocked: boolean;
    unlocked_at?: string;
  };
  currentProgress?: number;
  targetProgress?: number;
  isPremium: boolean;
}

export default function AchievementCard({ achievement, currentProgress, targetProgress, isPremium }: AchievementCardProps) {
  const navigate = useNavigate();
  const isLocked = !achievement.unlocked;
  const needsPremium = achievement.is_premium && !isPremium;
  
  const progressPercentage = currentProgress && targetProgress 
    ? Math.min((currentProgress / targetProgress) * 100, 100) 
    : 0;

  return (
    <Card
      className={`transition-all ${
        isLocked
          ? "opacity-60 grayscale"
          : "border-yellow-500 shadow-lg shadow-yellow-500/20"
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{achievement.icon}</div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {achievement.title}
                {achievement.is_premium && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {achievement.description}
              </CardDescription>
            </div>
          </div>
          {isLocked && (
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Progress Bar for Locked Achievements */}
        {isLocked && !needsPremium && currentProgress !== undefined && targetProgress !== undefined && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{currentProgress}/{targetProgress}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            {progressPercentage >= 80 && (
              <p className="text-xs text-primary">Almost there! Keep going! 🎯</p>
            )}
          </div>
        )}

        {achievement.unlocked && achievement.unlocked_at && (
          <p className="text-xs text-muted-foreground mt-2">
            Unlocked: {new Date(achievement.unlocked_at).toLocaleDateString("id-ID")}
          </p>
        )}

        {needsPremium && isLocked && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/premium")}
              className="w-full"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Unlock
            </Button>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

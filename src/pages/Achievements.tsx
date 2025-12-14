import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, BarChart3, Target, Palette } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AchievementCard from "@/components/AchievementCard";

interface Achievement {
  achievement_type: string;
  title: string;
  description: string;
  is_premium: boolean;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
}

const Achievements = () => {
  const [user, setUser] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameStats, setGameStats] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // Check premium status
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "premium");

    setIsPremium(roles && roles.length > 0);
    fetchAchievements(session.user.id);
  };

  const fetchAchievements = async (userId: string) => {
    setLoading(true);

    // Fetch all achievement definitions
    const { data: definitions } = await supabase
      .from("achievement_definitions")
      .select("*")
      .order("is_premium", { ascending: true })
      .order("created_at", { ascending: true });

    // Fetch user's unlocked achievements
    const { data: unlocked } = await supabase
      .from("user_achievements")
      .select("achievement_type, unlocked_at")
      .eq("user_id", userId);

    const unlockedMap = new Map(
      unlocked?.map(u => [u.achievement_type, u.unlocked_at]) || []
    );

    const achievementsWithStatus = definitions?.map(def => ({
      ...def,
      unlocked: unlockedMap.has(def.achievement_type),
      unlocked_at: unlockedMap.get(def.achievement_type)
    })) || [];

    setAchievements(achievementsWithStatus);
    
    // Fetch game stats for progress tracking
    const { data: stats } = await supabase
      .from("game_stats")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    setGameStats(stats);
    setLoading(false);
  };

  const getAchievementProgress = (achievementType: string) => {
    if (!gameStats) return { current: 0, target: 0 };

    const progressMap: Record<string, { current: number; target: number }> = {
      'first_win': { current: gameStats.wins, target: 1 },
      'win_streak_3': { current: gameStats.best_streak, target: 3 },
      'win_streak_5': { current: gameStats.best_streak, target: 5 },
      'win_streak_10': { current: gameStats.best_streak, target: 10 },
      'total_wins_10': { current: gameStats.wins, target: 10 },
      'total_wins_50': { current: gameStats.wins, target: 50 },
      'total_wins_100': { current: gameStats.wins, target: 100 },
      'games_100': { current: gameStats.total_games, target: 100 },
      'no_losses_10': { current: gameStats.wins, target: 10 },
    };

    return progressMap[achievementType] || { current: 0, target: 0 };
  };

  const stats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.unlocked).length,
    premium: achievements.filter(a => a.is_premium).length,
    premiumUnlocked: achievements.filter(a => a.is_premium && a.unlocked).length
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/statistics")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/challenges")}
            >
              <Target className="h-4 w-4 mr-2" />
              Challenges
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/themes")}
            >
              <Palette className="h-4 w-4 mr-2" />
              Themes
            </Button>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Achievements
          </h1>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Kamu</CardTitle>
            <CardDescription>
              Kumpulkan semua achievement untuk menjadi master!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold text-primary">{stats.unlocked}</p>
                <p className="text-sm text-muted-foreground">Unlocked</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold text-yellow-500">{stats.premiumUnlocked}</p>
                <p className="text-sm text-muted-foreground">Premium Unlocked</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{Math.round((stats.unlocked / stats.total) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
              </Card>
            ))
          ) : (
            achievements.map((achievement) => {
              const progress = getAchievementProgress(achievement.achievement_type);
              
              return (
                <AchievementCard
                  key={achievement.achievement_type}
                  achievement={achievement}
                  currentProgress={progress.current}
                  targetProgress={progress.target}
                  isPremium={isPremium}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Achievements;

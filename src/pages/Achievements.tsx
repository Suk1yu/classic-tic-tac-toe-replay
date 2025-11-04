import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Lock, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    setLoading(false);
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
              const isLocked = !achievement.unlocked;
              const needsPremium = achievement.is_premium && !isPremium;
              const canView = !isLocked || !needsPremium;

              return (
                <Card
                  key={achievement.achievement_type}
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
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Achievements;

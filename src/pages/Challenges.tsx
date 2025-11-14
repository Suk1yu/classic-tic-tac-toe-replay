import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, CheckCircle2, Trophy, Crown } from "lucide-react";
import { toast } from "sonner";

interface Challenge {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  target_value: number;
  reward_type: string;
  reward_value: string;
  is_premium: boolean;
  progress: number;
  completed: boolean;
}

export default function Challenges() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Check premium status
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "premium");
        
        setIsPremium(!!roles && roles.length > 0);

        // Get today's date at midnight local time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        
        // Delete old challenges (older than today)
        await supabase
          .from("daily_challenges")
          .delete()
          .lt("challenge_date", todayString);
        
        let { data: todaysChallenges, error: fetchError } = await supabase
          .from("daily_challenges")
          .select("*")
          .eq("challenge_date", todayString);

        if (fetchError) throw fetchError;

        // If no challenges for today, create them
        if (!todaysChallenges || todaysChallenges.length === 0) {
          const newChallenges = [
            {
              challenge_date: todayString,
              challenge_type: "daily_wins_3",
              title: "Triple Winner",
              description: "Menang 3 game hari ini",
              target_value: 3,
              reward_type: "achievement",
              reward_value: "Daily Winner",
              is_premium: false
            },
            {
              challenge_date: todayString,
              challenge_type: "daily_no_undo",
              title: "Pure Skills",
              description: "Menang 2 game tanpa menggunakan undo",
              target_value: 2,
              reward_type: "achievement",
              reward_value: "Skill Master",
              is_premium: false
            },
            {
              challenge_date: todayString,
              challenge_type: "daily_streak",
              title: "Streak Builder",
              description: "Raih win streak 5",
              target_value: 5,
              reward_type: "badge",
              reward_value: "Streak King",
              is_premium: true
            }
          ];

          const { data: created, error: createError } = await supabase
            .from("daily_challenges")
            .insert(newChallenges)
            .select();

          if (createError) throw createError;
          todaysChallenges = created;
        }

        // Get user progress for these challenges
        const challengeIds = todaysChallenges.map(c => c.id);
        const { data: progressData } = await supabase
          .from("user_challenge_progress")
          .select("*")
          .eq("user_id", user.id)
          .in("challenge_id", challengeIds);

        const challengesWithProgress = todaysChallenges.map(challenge => {
          const userProgress = progressData?.find(p => p.challenge_id === challenge.id);
          return {
            ...challenge,
            progress: userProgress?.progress || 0,
            completed: userProgress?.completed || false
          };
        });

        setChallenges(challengesWithProgress);
      } catch (error) {
        console.error("Error fetching challenges:", error);
        toast.error("Gagal memuat challenges");
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [navigate]);

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/achievements")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="w-8 h-8 text-primary" />
              Daily Challenges
            </h1>
            <p className="text-muted-foreground">Selesaikan challenge dan dapatkan rewards!</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const canView = !challenge.is_premium || isPremium;
              const progressPercentage = getProgressPercentage(challenge.progress, challenge.target_value);

              return (
                <Card
                  key={challenge.id}
                  className={challenge.completed ? "border-green-500 bg-green-50/10" : ""}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {challenge.title}
                          {challenge.is_premium && (
                            <Badge variant="default" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                          {challenge.completed && (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{challenge.description}</CardDescription>
                      </div>
                      <Trophy className={`w-6 h-6 ${challenge.completed ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {canView ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {challenge.progress}/{challenge.target_value}
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Reward:</span>
                          <span className="font-medium text-primary">{challenge.reward_value}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Crown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Upgrade ke Premium untuk unlock challenge ini</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

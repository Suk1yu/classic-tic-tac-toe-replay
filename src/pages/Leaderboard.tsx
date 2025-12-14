import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, Trophy, User } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  email: string;
  best_streak: number;
  total_wins: number;
  is_premium: boolean;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from("game_stats")
        .select(`
          user_id,
          best_streak,
          wins
        `)
        .order("best_streak", { ascending: false })
        .limit(50);

      if (statsError) throw statsError;

      if (!statsData || statsData.length === 0) {
        setLeaders([]);
        setLoading(false);
        return;
      }

      const userIds = statsData.map(s => s.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .eq("role", "premium");

      if (rolesError) throw rolesError;

      const premiumUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      const leaderboardData: LeaderboardEntry[] = statsData
        .map((stat, index) => {
          const profile = profilesData?.find(p => p.id === stat.user_id);
          return {
            rank: index + 1,
            user_id: stat.user_id,
            email: profile?.email || "Unknown",
            best_streak: stat.best_streak,
            total_wins: stat.wins,
            is_premium: premiumUserIds.has(stat.user_id)
          };
        })
        .filter(entry => entry.best_streak > 0);

      setLeaders(leaderboardData.slice(0, 10));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Gagal memuat leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel("game_stats_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_stats"
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const renderLeaderboard = () => {
    if (leaders.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Belum ada data leaderboard
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {leaders.map((entry) => (
          <Card
            key={entry.user_id}
            className={entry.rank <= 3 ? "border-primary/50 bg-primary/5" : ""}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary">
                {entry.rank === 1 && <Trophy className="w-6 h-6 text-yellow-500" />}
                {entry.rank === 2 && <Trophy className="w-6 h-6 text-gray-400" />}
                {entry.rank === 3 && <Trophy className="w-6 h-6 text-amber-700" />}
                {entry.rank > 3 && (
                  <span className="text-lg font-bold">#{entry.rank}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{entry.email}</p>
                  {entry.is_premium ? (
                    <Badge variant="default" className="shrink-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      <User className="w-3 h-3 mr-1" />
                      Free
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {entry.total_wins} Wins
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {entry.best_streak}
                </p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Leaderboard Global
            </h1>
            <p className="text-muted-foreground">Top 10 Players by Win Streak</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          renderLeaderboard()
        )}
      </div>
    </div>
  );
}

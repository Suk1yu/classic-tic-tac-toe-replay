import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Clock, Zap, Target } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface GameHistory {
  date: string;
  duration: number;
  result: string;
  moves: number;
}

interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  total_games: number;
  total_moves: number;
  total_game_time: number;
  best_streak: number;
  games_history: GameHistory[];
}

export default function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("game_stats")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        let history: GameHistory[] = [];
        try {
          if (data.games_history && Array.isArray(data.games_history)) {
            history = data.games_history.map((item: any) => ({
              date: item.date || "",
              duration: item.duration || 0,
              result: item.result || "",
              moves: item.moves || 0
            }));
          }
        } catch (e) {
          console.error("Error parsing games_history:", e);
        }

        setStats({
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          total_games: data.total_games,
          total_moves: data.total_moves,
          total_game_time: data.total_game_time,
          best_streak: data.best_streak,
          games_history: history
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Gagal memuat statistik");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const winRate = stats.total_games > 0 ? (stats.wins / stats.total_games) * 100 : 0;
  const avgDuration = stats.total_games > 0 ? stats.total_game_time / stats.total_games : 0;
  const avgMoves = stats.total_games > 0 ? stats.total_moves / stats.total_games : 0;

  // Process weekly data
  const weeklyData = stats.games_history
    .filter(g => g.date)
    .reduce((acc: any[], game) => {
      const date = new Date(game.date);
      const weekKey = `Week ${Math.ceil(date.getDate() / 7)}`;
      const existing = acc.find(d => d.week === weekKey);
      
      if (existing) {
        if (game.result === 'win') existing.wins++;
        else if (game.result === 'loss') existing.losses++;
        else existing.draws++;
      } else {
        acc.push({
          week: weekKey,
          wins: game.result === 'win' ? 1 : 0,
          losses: game.result === 'loss' ? 1 : 0,
          draws: game.result === 'draw' ? 1 : 0
        });
      }
      return acc;
    }, [])
    .slice(-4);

  // Process heat map data (hour of day)
  const heatMapData = Array.from({ length: 24 }, (_, hour) => {
    const count = stats.games_history.filter(g => {
      if (!g.date) return false;
      const gameHour = new Date(g.date).getHours();
      return gameHour === hour;
    }).length;
    
    return {
      hour: `${hour}:00`,
      games: count
    };
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/achievements")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-primary" />
              Game Statistics
            </h1>
            <p className="text-muted-foreground">Analisis performa permainan Anda</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-3xl font-bold">{winRate.toFixed(1)}%</p>
                <Progress value={winRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatDuration(Math.round(avgDuration))}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Total Moves
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total_moves.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">~{avgMoves.toFixed(1)} per game</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Best Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.best_streak}</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress Chart */}
        {weeklyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="wins" stroke="#22C55E" strokeWidth={2} />
                  <Line type="monotone" dataKey="losses" stroke="#EF4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="draws" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Heat Map */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Heat Map (by Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={heatMapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="games" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, Lock, Check } from "lucide-react";
import { toast } from "sonner";

interface Theme {
  id: string;
  name: string;
  grid_color: string;
  x_color: string;
  o_color: string;
  background_color: string;
  is_premium: boolean;
  unlock_requirement_type: string | null;
  unlock_requirement_value: string | null;
  is_unlocked: boolean;
  is_active: boolean;
}

export default function Themes() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const fetchThemes = async () => {
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

        // Get all themes
        const { data: themesData, error: themesError } = await supabase
          .from("theme_definitions")
          .select("*");

        if (themesError) throw themesError;

        // Get user's theme preferences
        const { data: userTheme } = await supabase
          .from("user_themes")
          .select("*")
          .eq("user_id", user.id)
          .single();

        // Get user achievements to check unlock requirements
        const { data: userAchievements } = await supabase
          .from("user_achievements")
          .select("achievement_type")
          .eq("user_id", user.id);

        const achievementTypes = new Set(userAchievements?.map(a => a.achievement_type) || []);

        // Get game stats for unlock requirements
        const { data: stats } = await supabase
          .from("game_stats")
          .select("total_games")
          .eq("user_id", user.id)
          .single();

        const themesWithStatus = themesData?.map(theme => {
          let isUnlocked = false;

          // Check unlock requirements
          if (!theme.unlock_requirement_type) {
            isUnlocked = true; // Always unlocked
          } else if (theme.is_premium && !isPremium) {
            isUnlocked = false; // Premium themes locked for non-premium
          } else if (theme.unlock_requirement_type === "achievement") {
            isUnlocked = achievementTypes.has(theme.unlock_requirement_value || "");
          } else if (theme.unlock_requirement_type === "games_played") {
            const required = parseInt(theme.unlock_requirement_value || "0");
            isUnlocked = (stats?.total_games || 0) >= required;
          } else {
            isUnlocked = userTheme?.unlocked_themes?.includes(theme.id) || false;
          }

          return {
            ...theme,
            is_unlocked: isUnlocked,
            is_active: userTheme?.active_theme_id === theme.id
          };
        }) || [];

        setThemes(themesWithStatus);
      } catch (error) {
        console.error("Error fetching themes:", error);
        toast.error("Gagal memuat themes");
      } finally {
        setLoading(false);
      }
    };

    fetchThemes();
  }, [navigate, isPremium]);

  const applyTheme = async (theme: Theme) => {
    // Double check premium requirement
    if (theme.is_premium && !isPremium) {
      toast.error("Theme ini hanya untuk member premium!");
      navigate("/premium");
      return;
    }

    if (!theme.is_unlocked) {
      toast.error("Theme ini masih terkunci!");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update user's active theme
      const { error } = await supabase
        .from("user_themes")
        .upsert({
          user_id: user.id,
          active_theme_id: theme.id,
          unlocked_themes: themes.filter(t => t.is_unlocked).map(t => t.id)
        });

      if (error) throw error;

      // Apply theme to CSS variables (matching useTheme.tsx variable names)
      document.documentElement.style.setProperty('--grid-color', theme.grid_color);
      document.documentElement.style.setProperty('--x-color', theme.x_color);
      document.documentElement.style.setProperty('--o-color', theme.o_color);
      document.documentElement.style.setProperty('--bg-color', theme.background_color);

      setThemes(themes.map(t => ({
        ...t,
        is_active: t.id === theme.id
      })));

      toast.success(`Theme "${theme.name}" diterapkan!`);
    } catch (error) {
      console.error("Error applying theme:", error);
      toast.error("Gagal menerapkan theme");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Themes</h1>
            <p className="text-muted-foreground">Customize tampilan game Anda</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <Card
                key={theme.id}
                className={`cursor-pointer transition-all ${
                  theme.is_active ? "border-primary ring-2 ring-primary" : ""
                } ${!theme.is_unlocked ? "opacity-60" : ""}`}
                onClick={() => applyTheme(theme)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {theme.name}
                      {theme.is_active && <Check className="w-5 h-5 text-primary" />}
                    </CardTitle>
                    {theme.is_premium && (
                      <Badge variant="default" className="text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Theme Preview */}
                    <div
                      className="w-full h-32 rounded-lg border-2 p-4 flex items-center justify-center gap-4"
                      style={{ 
                        backgroundColor: theme.background_color,
                        borderColor: theme.grid_color 
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl"
                        style={{ 
                          backgroundColor: theme.x_color,
                          color: theme.background_color 
                        }}
                      >
                        X
                      </div>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl"
                        style={{ 
                          backgroundColor: theme.o_color,
                          color: theme.background_color 
                        }}
                      >
                        O
                      </div>
                    </div>

                    {/* Lock Status */}
                    {!theme.is_unlocked && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        {theme.unlock_requirement_type === "achievement" && (
                          <span>Unlock: Complete {theme.unlock_requirement_value}</span>
                        )}
                        {theme.unlock_requirement_type === "games_played" && (
                          <span>Unlock: Play {theme.unlock_requirement_value} games</span>
                        )}
                        {theme.is_premium && !isPremium && (
                          <span>Unlock: Upgrade to Premium</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

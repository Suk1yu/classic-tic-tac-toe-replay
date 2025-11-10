import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTheme = (userId: string | null) => {
  const [activeTheme, setActiveTheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    loadTheme();
  }, [userId]);

  const loadTheme = async () => {
    if (!userId) return;

    try {
      // Get user's active theme
      const { data: userTheme } = await supabase
        .from("user_themes")
        .select("active_theme_id")
        .eq("user_id", userId)
        .single();

      if (userTheme?.active_theme_id) {
        // Get theme definition
        const { data: theme } = await supabase
          .from("theme_definitions")
          .select("*")
          .eq("id", userTheme.active_theme_id)
          .single();

        if (theme) {
          applyTheme(theme);
          setActiveTheme(theme);
        }
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: any) => {
    const root = document.documentElement;
    root.style.setProperty("--grid-color", theme.grid_color);
    root.style.setProperty("--x-color", theme.x_color);
    root.style.setProperty("--o-color", theme.o_color);
    root.style.setProperty("--bg-color", theme.background_color);
  };

  const changeTheme = async (themeId: string) => {
    if (!userId) return;

    const { data: theme } = await supabase
      .from("theme_definitions")
      .select("*")
      .eq("id", themeId)
      .single();

    if (theme) {
      applyTheme(theme);
      setActiveTheme(theme);

      // Save to database
      await supabase
        .from("user_themes")
        .upsert({
          user_id: userId,
          active_theme_id: themeId,
        });
    }
  };

  return { activeTheme, loading, changeTheme, reloadTheme: loadTheme };
};

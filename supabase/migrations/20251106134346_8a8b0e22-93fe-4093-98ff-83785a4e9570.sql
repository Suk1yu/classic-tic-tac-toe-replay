-- Add new achievements (checking for duplicates)
INSERT INTO achievement_definitions (achievement_type, title, description, icon, is_premium) VALUES
('newcomer', 'Newcomer', 'Play your first game', '🎮', false),
('persistent', 'Persistent Player', 'Play 5 games in one day', '💪', false),
('night_owl', 'Night Owl', 'Play a game between midnight and 4 AM', '🦉', false),
('premium_warrior', 'Premium Warrior', 'Win 100 games as premium user', '⚔️', true),
('premium_legend', 'Premium Legend', 'Reach 20 win streak as premium', '🌟', true),
('premium_master', 'Premium Master', 'Win 50 perfect games as premium', '🏆', true),
('premium_champion', 'Premium Champion', 'Win 200 total games as premium', '👑', true),
('flawless_streak', 'Flawless Streak', 'Win 15 games in a row without using undo', '💎', true)
ON CONFLICT (achievement_type) DO NOTHING;
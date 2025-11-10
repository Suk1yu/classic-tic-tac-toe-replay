import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Users, Bot, Volume2, VolumeX, Undo2, Menu } from "lucide-react";
import { soundManager } from "@/utils/sounds";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { checkAndUnlockAchievements } from "@/utils/achievements";
import { trackChallengeProgress } from "@/utils/challengeTracking";
import FullscreenMenu from "./FullscreenMenu";
import { Lightbulb, Shield } from "lucide-react";

type Player = "X" | "O" | null;
type Board = Player[];

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const GameBoard = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [boardHistory, setBoardHistory] = useState<Board[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [scores, setScores] = useState({ player: 0, computer: 0, ties: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [is1PMode, setIs1PMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [undoUsedInGame, setUndoUsedInGame] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [movesInGame, setMovesInGame] = useState(0);
  const [blockedCell, setBlockedCell] = useState<number | null>(null);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [powerupsUsed, setPowerupsUsed] = useState({ hint: false, block: false });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    } else {
      setIsPremium(false);
    }
  }, [user]);

  const checkPremiumStatus = async () => {
    if (!user) return;
    
    // Check if user has premium role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "premium");
    
    // Check if user has active trial
    const { data: trial } = await supabase
      .from("premium_trials")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gte("trial_end_date", new Date().toISOString())
      .maybeSingle();
    
    setIsPremium((roles && roles.length > 0) || !!trial);
  };

  const checkWinner = (currentBoard: Board): { winner: Player; line: number[] } => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return { winner: currentBoard[a], line: combo };
      }
    }
    return { winner: null, line: [] };
  };

  const isBoardFull = (currentBoard: Board) => currentBoard.every((cell) => cell !== null);

  const minimax = (board: Board, isMaximizing: boolean): number => {
    const { winner } = checkWinner(board);
    
    if (winner === "O") return 10;
    if (winner === "X") return -10;
    if (isBoardFull(board)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = "O";
          const score = minimax(board, false);
          board[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = "X";
          const score = minimax(board, true);
          board[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const findBestMove = (currentBoard: Board): number => {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = "O";
        const score = minimax([...currentBoard], false);
        currentBoard[i] = null;
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  };

  const makeComputerMove = (currentBoard: Board) => {
    const emptyCells = currentBoard
      .map((cell, index) => (cell === null && index !== blockedCell ? index : null))
      .filter((val) => val !== null) as number[];

    if (emptyCells.length === 0) return;

    let moveIndex: number;

    // Difficulty based AI:
    // 0: 100% random
    // 1-2: 70% random, 30% smart
    // 3-4: 40% random, 60% smart
    // 5+: 100% smart (unbeatable)
    
    const smartProbability = difficulty === 0 ? 0 : 
                             difficulty <= 2 ? 0.3 :
                             difficulty <= 4 ? 0.6 : 1.0;
    
    const useSmartMove = Math.random() < smartProbability;

    if (useSmartMove) {
      moveIndex = findBestMove([...currentBoard]);
    } else {
      moveIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    const newBoard = [...currentBoard];
    newBoard[moveIndex] = "O";
    setBoard(newBoard);

    const { winner: newWinner, line } = checkWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
      setWinningLine(line);
      setGameOver(true);
      setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
      soundManager.playLose();
      toast.error("Computer wins!");
    } else if (isBoardFull(newBoard)) {
      setGameOver(true);
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
      soundManager.playTie();
      toast("It's a tie!");
    } else {
      setIsPlayerTurn(true);
    }
  };

  const handleCellClick = async (index: number) => {
    if (board[index] || gameOver || index === blockedCell) return;
    
    // In 1P mode, only allow when it's player turn
    if (is1PMode && !isPlayerTurn) return;

    soundManager.playClick();

    // Save board to history before making move
    setBoardHistory([...boardHistory, [...board]]);
    setMovesInGame(movesInGame + 1);

    const currentPlayer = isPlayerTurn ? "X" : "O";
    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const { winner: newWinner, line } = checkWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
      setWinningLine(line);
      setGameOver(true);
      if (is1PMode) {
        if (currentPlayer === "X") {
          const newPlayerScore = scores.player + 1;
          setScores((prev) => ({ ...prev, player: newPlayerScore }));
          
          // Update stats and check achievements
          if (user) {
            const { data: stats } = await supabase
              .from("game_stats")
              .select("*")
              .eq("user_id", user.id)
              .single();

            if (stats) {
              const gameDuration = Math.round((Date.now() - gameStartTime) / 1000);
              const newStats = {
                wins: stats.wins + 1,
                total_games: stats.total_games + 1,
                current_streak: stats.current_streak + 1,
                best_streak: Math.max(stats.best_streak, stats.current_streak + 1),
                total_moves: stats.total_moves + movesInGame + 1,
                total_game_time: stats.total_game_time + gameDuration,
                games_history: [
                  ...(Array.isArray(stats.games_history) ? stats.games_history : []),
                  {
                    date: new Date().toISOString(),
                    duration: gameDuration,
                    result: 'win',
                    moves: movesInGame + 1
                  }
                ]
              };

              await supabase
                .from("game_stats")
                .update(newStats)
                .eq("user_id", user.id);

              await checkAndUnlockAchievements(user.id, {
                ...stats,
                ...newStats
              }, {
                won: true,
                usedUndo: undoUsedInGame,
                gameDuration
              });

              // Track challenge progress
              await trackChallengeProgress(user.id, {
                won: true,
                usedUndo: undoUsedInGame,
                streak: newStats.current_streak,
                isPerfectGame: !undoUsedInGame
              });
            }
          }
          
          // Increase difficulty every 3 wins
          if (newPlayerScore % 3 === 0) {
            setDifficulty((prev) => prev + 1);
            toast.success(`You win! Bot difficulty increased to level ${difficulty + 1}!`);
          } else {
            toast.success("You win!");
          }
          soundManager.playWin();
        } else {
          setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
          soundManager.playLose();
          toast.error("Computer wins!");
        }
      } else {
        if (currentPlayer === "X") {
          setScores((prev) => ({ ...prev, player: prev.player + 1 }));
          soundManager.playWin();
          toast.success("Player X wins!");
        } else {
          setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
          soundManager.playWin();
          toast.success("Player O wins!");
        }
      }
    } else if (isBoardFull(newBoard)) {
      setGameOver(true);
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
      
      // Update stats for draws
      if (user) {
        const { data: stats } = await supabase
          .from("game_stats")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (stats) {
          const gameDuration = Math.round((Date.now() - gameStartTime) / 1000);
          const newStats = {
            total_games: stats.total_games + 1,
            draws: stats.draws + 1,
            current_streak: 0,
            total_moves: stats.total_moves + movesInGame + 1,
            total_game_time: stats.total_game_time + gameDuration,
            games_history: [
              ...(Array.isArray(stats.games_history) ? stats.games_history : []),
              {
                date: new Date().toISOString(),
                duration: gameDuration,
                result: 'draw',
                moves: movesInGame + 1
              }
            ]
          };

          await supabase
            .from("game_stats")
            .update(newStats)
            .eq("user_id", user.id);

          await checkAndUnlockAchievements(user.id, {
            ...stats,
            ...newStats
          });
        }
      }
      
      soundManager.playTie();
      toast("It's a tie!");
    } else {
      setIsPlayerTurn(!isPlayerTurn);
    }
  };

  useEffect(() => {
    if (is1PMode && !isPlayerTurn && !gameOver) {
      const timer = setTimeout(() => {
        makeComputerMove(board);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameOver, is1PMode]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setBoardHistory([]);
    setIsPlayerTurn(true);
    setWinner(null);
    setWinningLine([]);
    setGameOver(false);
    setGameStartTime(Date.now());
    setUndoUsedInGame(false);
    setMovesInGame(0);
    setBlockedCell(null);
    setHintCell(null);
    setPowerupsUsed({ hint: false, block: false });
  };

  const handleUndo = () => {
    if (!isPremium) {
      toast.error("Fitur undo hanya untuk member premium!");
      return;
    }

    if (boardHistory.length === 0) {
      toast.error("Tidak ada langkah yang bisa di-undo");
      return;
    }

    const previousBoard = boardHistory[boardHistory.length - 1];
    setBoard(previousBoard);
    setBoardHistory(boardHistory.slice(0, -1));
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinner(null);
    setWinningLine([]);
    setUndoUsedInGame(true);
    soundManager.playClick();
    toast.success("Langkah berhasil di-undo");
  };

  const resetScores = () => {
    setScores({ player: 0, computer: 0, ties: 0 });
    setDifficulty(0);
    resetGame();
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPremium(false);
    toast.success("Logged out successfully");
  };

  const toggleMode = () => {
    setIs1PMode(!is1PMode);
    resetGame();
    setScores({ player: 0, computer: 0, ties: 0 });
    setDifficulty(0);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.setEnabled(!soundEnabled);
  };

  const useHint = () => {
    if (!isPremium) {
      toast.error("Power-up hint hanya untuk member premium!");
      return;
    }

    if (powerupsUsed.hint) {
      toast.error("Hint sudah digunakan di game ini");
      return;
    }

    if (gameOver || !isPlayerTurn) {
      toast.error("Tidak bisa menggunakan hint sekarang");
      return;
    }

    // Find best move
    const bestMove = findBestMove([...board]);
    if (bestMove !== -1) {
      setHintCell(bestMove);
      setPowerupsUsed({ ...powerupsUsed, hint: true });
      toast.success("💡 Cell terbaik sudah di-highlight!");
      
      // Clear hint after 3 seconds
      setTimeout(() => setHintCell(null), 3000);
    }
  };

  const useBlockCell = () => {
    if (!isPremium) {
      toast.error("Power-up block hanya untuk member premium!");
      return;
    }

    if (powerupsUsed.block) {
      toast.error("Block sudah digunakan di game ini");
      return;
    }

    if (gameOver || !isPlayerTurn) {
      toast.error("Tidak bisa menggunakan block sekarang");
      return;
    }

    // Find computer's best move and block it
    const computerBestMove = findBestMove([...board]);
    if (computerBestMove !== -1) {
      setBlockedCell(computerBestMove);
      setPowerupsUsed({ ...powerupsUsed, block: true });
      toast.success("🛡️ Cell diblokir untuk 1 turn!");
      
      // Clear block after computer's turn
      setTimeout(() => setBlockedCell(null), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <FullscreenMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        user={user}
        isPremium={isPremium}
        onLogout={handleLogout}
      />

      <div className="absolute top-4 left-4 flex gap-2">
        <Button
          onClick={resetScores}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          title="Reset Scores"
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
        <Button
          onClick={handleUndo}
          variant={isPremium ? "default" : "ghost"}
          size="icon"
          className={isPremium ? "" : "text-muted-foreground hover:text-foreground"}
          title={isPremium ? "Undo (Premium)" : "Undo (Premium Only)"}
          disabled={!isPremium || boardHistory.length === 0}
        >
          <Undo2 className="h-6 w-6" />
        </Button>
      </div>

      {/* Power-ups (Premium Only) */}
      {isPremium && is1PMode && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <Button
            onClick={useHint}
            variant="default"
            size="sm"
            className="gap-2"
            disabled={powerupsUsed.hint || gameOver || !isPlayerTurn}
          >
            <Lightbulb className="h-4 w-4" />
            Hint
          </Button>
          <Button
            onClick={useBlockCell}
            variant="default"
            size="sm"
            className="gap-2"
            disabled={powerupsUsed.block || gameOver || !isPlayerTurn}
          >
            <Shield className="h-4 w-4" />
            Block
          </Button>
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          onClick={toggleSound}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          title={soundEnabled ? "Mute Sound" : "Unmute Sound"}
        >
          {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </Button>
        <Button
          onClick={() => setIsMenuOpen(true)}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          title="Menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <div 
        className="flex flex-col items-center gap-8"
        onClick={() => gameOver && resetGame()}
      >

        <div 
          className="grid grid-cols-3 gap-0 p-0 bg-gridLine"
             style={{ 
               width: 'min(90vw, 450px)', 
               height: 'min(90vw, 450px)',
               gridTemplateColumns: 'repeat(3, 1fr)',
             }}>
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={is1PMode && !isPlayerTurn}
              className={`
                bg-background border-0 flex items-center justify-center
                transition-all duration-300
                hover:bg-secondary disabled:cursor-not-allowed
                ${index % 3 !== 2 ? 'border-r-4 border-gridLine' : ''}
                ${index < 6 ? 'border-b-4 border-gridLine' : ''}
              `}
              style={{ 
                aspectRatio: '1/1',
              }}
            >
              {cell && (
                <span 
                  className={`
                    text-8xl font-sans transition-all duration-500
                    ${cell === 'X' ? 'text-playerX' : 'text-playerO'}
                    ${winningLine.includes(index) ? 'font-black scale-110 animate-[pulse_1s_ease-in-out_3]' : ''}
                    ${gameOver && !winningLine.includes(index) && cell ? 'opacity-30' : ''}
                    ${!gameOver ? 'animate-in fade-in zoom-in duration-300' : ''}
                  `}
                >
                  {cell}
                </span>
              )}
              {/* Hint indicator */}
              {!cell && hintCell === index && (
                <div className="absolute inset-0 bg-yellow-400/30 animate-pulse rounded-lg border-4 border-yellow-400" />
              )}
              {/* Blocked cell indicator */}
              {blockedCell === index && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="h-16 w-16 text-red-500 animate-pulse" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-8 text-center items-center">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">PLAYER (X)</span>
            <span className="text-3xl font-bold text-playerX">{scores.player}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">TIE</span>
            <span className="text-3xl font-bold text-foreground">{scores.ties}</span>
          </div>
          <div className="flex flex-col relative">
            <span className="text-sm text-muted-foreground">{is1PMode ? "COMPUTER (O)" : "PLAYER (O)"}</span>
            <span className="text-3xl font-bold text-playerO">{scores.computer}</span>
            <Button
              onClick={toggleMode}
              variant="ghost"
              size="icon"
              className="absolute -right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={is1PMode ? "Switch to 2 Players" : "Switch to vs Computer"}
            >
              {is1PMode ? <Users className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {is1PMode && !isPlayerTurn && !gameOver && (
          <div className="text-muted-foreground animate-pulse">
            Computer is thinking...
          </div>
        )}
        
        {gameOver && (
          <div className="text-muted-foreground text-sm animate-pulse">
            Click anywhere to continue
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Users, Bot, Volume2, VolumeX } from "lucide-react";
import { soundManager } from "@/utils/sounds";

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
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [scores, setScores] = useState({ player: 0, computer: 0, ties: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [is1PMode, setIs1PMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState(0); // Increases every 5 player wins

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
      .map((cell, index) => (cell === null ? index : null))
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

  const handleCellClick = (index: number) => {
    if (board[index] || gameOver) return;
    
    // In 1P mode, only allow when it's player turn
    if (is1PMode && !isPlayerTurn) return;

    soundManager.playClick();

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
          
          // Increase difficulty every 5 wins
          if (newPlayerScore % 5 === 0) {
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
    setIsPlayerTurn(true);
    setWinner(null);
    setWinningLine([]);
    setGameOver(false);
  };

  const resetScores = () => {
    setScores({ player: 0, computer: 0, ties: 0 });
    setDifficulty(0);
    resetGame();
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Button
        onClick={resetScores}
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
        title="Reset Scores"
      >
        <RotateCcw className="h-6 w-6" />
      </Button>

      <Button
        onClick={toggleSound}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        title={soundEnabled ? "Mute Sound" : "Unmute Sound"}
      >
        {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
      </Button>

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

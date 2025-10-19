import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Users, Bot } from "lucide-react";

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

  const makeComputerMove = (currentBoard: Board) => {
    const emptyCells = currentBoard
      .map((cell, index) => (cell === null ? index : null))
      .filter((val) => val !== null) as number[];

    if (emptyCells.length === 0) return;

    // Simple AI: random move
    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = [...currentBoard];
    newBoard[randomIndex] = "O";
    setBoard(newBoard);

    const { winner: newWinner, line } = checkWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
      setWinningLine(line);
      setGameOver(true);
      setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
      toast.error("Computer wins!");
    } else if (isBoardFull(newBoard)) {
      setGameOver(true);
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
      toast("It's a tie!");
    } else {
      setIsPlayerTurn(true);
    }
  };

  const handleCellClick = (index: number) => {
    if (board[index] || gameOver) return;
    
    // In 2P mode, check turn; in 1P mode, only allow when it's player turn
    if (is1PMode && !isPlayerTurn) return;

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
          setScores((prev) => ({ ...prev, player: prev.player + 1 }));
          toast.success("You win!");
        } else {
          setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
          toast.error("Computer wins!");
        }
      } else {
        if (currentPlayer === "X") {
          setScores((prev) => ({ ...prev, player: prev.player + 1 }));
          toast.success("Player X wins!");
        } else {
          setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
          toast.success("Player O wins!");
        }
      }
    } else if (isBoardFull(newBoard)) {
      setGameOver(true);
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
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
    resetGame();
  };

  const handleBoardClick = () => {
    if (gameOver) {
      resetGame();
    }
  };

  const toggleMode = () => {
    setIs1PMode(!is1PMode);
    resetGame();
    setScores({ player: 0, computer: 0, ties: 0 });
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

      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          TIC TAC TOE
        </h1>

        <div 
          onClick={handleBoardClick}
          className={`grid grid-cols-3 gap-0 p-0 bg-gridLine ${gameOver ? 'cursor-pointer' : ''}`}
             style={{ 
               width: 'min(90vw, 450px)', 
               height: 'min(90vw, 450px)',
               gridTemplateColumns: 'repeat(3, 1fr)',
             }}>
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={!isPlayerTurn || gameOver || cell !== null}
              className={`
                bg-background border-0 flex items-center justify-center
                text-6xl font-bold transition-all duration-300
                hover:bg-secondary disabled:cursor-not-allowed
                ${winningLine.includes(index) ? 'animate-pulse bg-accent/20' : ''}
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
                    ${cell === 'X' ? 'text-playerX' : 'text-playerO'}
                    animate-in fade-in zoom-in duration-300
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
          <div className="text-muted-foreground text-sm">
            Click anywhere to continue
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;

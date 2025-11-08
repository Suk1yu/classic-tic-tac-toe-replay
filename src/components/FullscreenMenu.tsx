import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";

interface FullscreenMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isPremium: boolean;
  onLogout: () => void;
}

const FullscreenMenu = ({ isOpen, onClose, user, isPremium, onLogout }: FullscreenMenuProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogoutClick = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 z-50 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      
      <div
        className={`fixed inset-0 bg-card/95 backdrop-blur-md z-50 transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-8 md:p-16">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 md:top-8 md:right-8 w-12 h-12 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-foreground hover:bg-muted/50 transition-all duration-300"
          >
            <X className="h-6 w-6 text-foreground" />
          </button>

          <nav className="flex-1 flex flex-col justify-center gap-6 md:gap-8">
            <button
              onClick={() => handleNavigate("/")}
              className="group flex items-center justify-between text-left"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                  Home
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground">(01)</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
            </button>

            <button
              onClick={() => handleNavigate("/achievements")}
              className="group flex items-center justify-between text-left"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                  Achievements
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground">(02)</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
            </button>

            <button
              onClick={() => handleNavigate("/leaderboard")}
              className="group flex items-center justify-between text-left"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                  Leaderboard
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground">(03)</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
            </button>

            <button
              onClick={() => handleNavigate("/challenges")}
              className="group flex items-center justify-between text-left"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                  Challenges
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground">(04)</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
            </button>

            <button
              onClick={() => handleNavigate("/themes")}
              className="group flex items-center justify-between text-left"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                  Themes
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground">(05)</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
            </button>

            <button
              onClick={() => handleNavigate("/premium")}
              className="group flex items-center justify-between text-left"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                  {isPremium ? "Premium" : "Upgrade"}
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground">(06)</span>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
            </button>

            {user ? (
              <button
                onClick={handleLogoutClick}
                className="group flex items-center justify-between text-left"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-destructive group-hover:translate-x-2">
                    Logout
                  </span>
                  <span className="text-2xl md:text-3xl text-muted-foreground">(07)</span>
                </div>
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-destructive group-hover:bg-destructive/10 group-hover:scale-110">
                  <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-destructive transition-colors duration-300" />
                </div>
              </button>
            ) : (
              <button
                onClick={() => handleNavigate("/auth")}
                className="group flex items-center justify-between text-left"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl md:text-7xl font-bold text-foreground transition-all duration-300 group-hover:text-accent group-hover:translate-x-2">
                    Login
                  </span>
                  <span className="text-2xl md:text-3xl text-muted-foreground">(07)</span>
                </div>
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent group-hover:bg-accent/10 group-hover:scale-110">
                  <ArrowRight className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
                </div>
              </button>
            )}
          </nav>

          <div className="mt-auto">
            <p className="text-muted-foreground text-sm md:text-base mb-4">Follow me.</p>
            <div className="flex flex-wrap gap-4 md:gap-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors duration-300 group"
              >
                <span className="uppercase tracking-wide">Instagram</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors duration-300 group"
              >
                <span className="uppercase tracking-wide">Github</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors duration-300 group"
              >
                <span className="uppercase tracking-wide">Twitter</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FullscreenMenu;

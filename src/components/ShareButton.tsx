import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download, Check } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ShareButtonProps {
  title: string;
  description: string;
  stats?: {
    wins?: number;
    streak?: number;
    games?: number;
  };
  icon?: string;
}

const ShareButton = ({ title, description, stats, icon }: ShareButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareImage = async () => {
    setIsGenerating(true);
    
    try {
      // Create temporary div for share card
      const shareCard = document.createElement("div");
      shareCard.style.cssText = `
        position: fixed;
        left: -9999px;
        width: 600px;
        padding: 40px;
        background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%);
        border-radius: 20px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      
      shareCard.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 80px; margin-bottom: 20px;">${icon || "🎉"}</div>
          <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 16px;">${title}</h2>
          <p style="font-size: 20px; margin-bottom: 30px; opacity: 0.9;">${description}</p>
          ${stats ? `
            <div style="display: flex; justify-content: space-around; margin-top: 30px; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
              ${stats.wins ? `<div><div style="font-size: 36px; font-weight: bold;">${stats.wins}</div><div style="font-size: 14px; opacity: 0.8;">Wins</div></div>` : ''}
              ${stats.streak ? `<div><div style="font-size: 36px; font-weight: bold;">${stats.streak}</div><div style="font-size: 14px; opacity: 0.8;">Streak</div></div>` : ''}
              ${stats.games ? `<div><div style="font-size: 36px; font-weight: bold;">${stats.games}</div><div style="font-size: 14px; opacity: 0.8;">Games</div></div>` : ''}
            </div>
          ` : ''}
          <div style="margin-top: 30px; font-size: 16px; opacity: 0.7;">Play Tic-Tac-Toe at ${window.location.origin}</div>
        </div>
      `;
      
      document.body.appendChild(shareCard);
      
      // Generate image
      const canvas = await html2canvas(shareCard, {
        backgroundColor: null,
        scale: 2,
      });
      
      document.body.removeChild(shareCard);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `tictactoe-${title.toLowerCase().replace(/\s/g, '-')}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          toast.success("Image downloaded! Share it on social media 🎉");
        }
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const text = `${title}\n${description}\n${stats ? `Stats: ${stats.wins || 0} wins, ${stats.streak || 0} streak` : ''}\nPlay at ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: window.location.origin,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-2"
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Copied!" : "Share"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={generateShareImage}
        disabled={isGenerating}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {isGenerating ? "Generating..." : "Download Image"}
      </Button>
    </div>
  );
};

export default ShareButton;

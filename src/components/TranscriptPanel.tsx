import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Copy, Download, Loader2, GripVertical, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";

interface TranscriptPanelProps {
  transcript: string | null;
  isLoading: boolean;
  onClose?: () => void;
}

export const TranscriptPanel = ({ transcript, isLoading, onClose }: TranscriptPanelProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);

  const handleCopy = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      toast({
        title: "Copied",
        description: "Transcript copied to clipboard",
      });
    }
  };

  const handleDownload = () => {
    if (transcript) {
      const blob = new Blob([transcript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Downloaded",
        description: "Transcript saved as TXT file",
      });
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleDragMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - startX;
      const newY = moveEvent.clientY - startY;
      
      const maxX = window.innerWidth - 380;
      const maxY = window.innerHeight - 300;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  if (!isExpanded) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
          zIndex: 10002,
        }}
        className="pointer-events-auto"
      >
        <GlassCard 
          className={`p-3 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleDragStart}
        >
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
          >
            📝 Transcript
          </Button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 10002,
      }}
      className="pointer-events-auto"
    >
      <GlassCard className="w-[360px]">
        {/* Drag Handle Header */}
        <div 
          className={`p-2 bg-muted/50 rounded-t-lg select-none flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">📝 Live Transcript</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating transcript...</p>
              <p className="text-xs text-muted-foreground">This may take 10-30 seconds</p>
            </div>
          ) : transcript ? (
            <>
              <div className="max-h-[300px] overflow-y-auto rounded-md border border-border/50 bg-background/50 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{transcript}</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transcript available
            </p>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Loader2, GripVertical, Minimize2, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export interface AISuggestion {
  id: number;
  text: string;
  priority: 'high' | 'medium' | 'low';
  reason?: string;
  covered?: boolean;
}

interface AISuggestionsPanelProps {
  suggestions: AISuggestion[];
  isLoading: boolean;
  onRegenerate?: () => void;
  onToggleCovered?: (id: number) => void;
}

export const AISuggestionsPanel = ({ 
  suggestions, 
  isLoading, 
  onRegenerate,
  onToggleCovered 
}: AISuggestionsPanelProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [position, setPosition] = useState({ x: window.innerWidth - 820, y: 100 });
  const [isDragging, setIsDragging] = useState(false);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'medium': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'low': return 'bg-muted/50 text-muted-foreground border-muted';
      default: return 'bg-muted/50 text-muted-foreground border-muted';
    }
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
          zIndex: 10001,
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
            🤖 AI Suggestions
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
        zIndex: 10001,
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
            <span className="text-xs font-semibold">🤖 AI Content Coach</span>
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
              <p className="text-sm text-muted-foreground">Analyzing content...</p>
              <p className="text-xs text-muted-foreground">Generating suggestions</p>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-3">
                  💡 Consider covering these topics next:
                </p>
                {suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: suggestion.id * 0.1 }}
                    className={`p-3 rounded-lg border transition-all ${
                      suggestion.covered 
                        ? 'bg-muted/30 border-muted opacity-60' 
                        : 'bg-background/50 border-border/50 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => onToggleCovered?.(suggestion.id)}
                        className="mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      >
                        {suggestion.covered ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className={`text-sm ${suggestion.covered ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {suggestion.text}
                        </p>
                        {suggestion.reason && !suggestion.covered && (
                          <p className="text-xs text-muted-foreground italic">
                            {suggestion.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Suggestions
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No suggestions available
            </p>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RealtimeTranscriptProps {
  isActive: boolean;
  transcript: string;
  partialText: string;
}

export const RealtimeTranscript = ({ 
  isActive, 
  transcript, 
  partialText 
}: RealtimeTranscriptProps) => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);

  // Auto-scroll to bottom when new text arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, partialText]);

  // Update word count
  useEffect(() => {
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [transcript]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast({
        title: "Copied to clipboard",
        description: "Transcript has been copied successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy transcript to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Mic className={isActive ? "text-destructive animate-pulse" : "text-muted-foreground"} />
          Live Transcript
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{wordCount} words</Badge>
          {transcript && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto space-y-2 text-sm bg-background/30 rounded-lg p-4"
      >
        {transcript ? (
          <>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
            {partialText && (
              <p className="text-muted-foreground italic">
                {partialText}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            {isActive 
              ? "Listening... start speaking to see your transcript here."
              : "Transcript will appear here when recording starts."}
          </p>
        )}
      </div>
    </GlassCard>
  );
};

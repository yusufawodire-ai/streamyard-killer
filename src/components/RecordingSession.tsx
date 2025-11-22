import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Video, Clock, FileText, Image, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface RecordingSessionProps {
  selectedBrand: string | null;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const RecordingSession = ({ selectedBrand }: RecordingSessionProps) => {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (selectedBrand) {
        query = query.eq('brand_id', selectedBrand);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "processing":
        return "bg-warning/10 text-warning border-warning/20";
      case "in-progress":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading sessions...</div>;
  }

  if (!sessions || sessions.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No recording sessions found.</div>;
  }

  return (
    <div className="space-y-4">
      {sessions.map((session, index) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <GlassCard variant="interactive" className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                <div className="h-20 w-32 rounded-lg glass-card flex items-center justify-center flex-shrink-0">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{session.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {session.brand_id} • {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(session.status)} variant="outline">
                      {session.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(session.duration_seconds)}
                    </span>
                    {session.transcript_url && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Transcript
                      </span>
                    )}
                    {session.final_video_url && (
                      <span className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        Thumbnail
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {session.status === "recording" && (
                  <Button size="sm" className="glass-button-primary">
                    <Play className="h-4 w-4 mr-1" />
                    Continue
                  </Button>
                )}
                {(session.status === "completed" || session.status === "processed") && (
                  <Button size="sm" variant="outline" className="glass-button">
                    View
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default RecordingSession;

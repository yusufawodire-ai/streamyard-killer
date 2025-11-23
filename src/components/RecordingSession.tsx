import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Video, Clock, FileText, Eye, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: sessions, isLoading, refetch } = useQuery({
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

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this recording? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      refetch();
      
      toast({
        title: "Session Deleted",
        description: "Recording session has been deleted",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete session",
        variant: "destructive",
      });
    }
  };

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
          <GlassCard 
            variant="interactive" 
            className="p-6 cursor-pointer"
            onClick={() => navigate(`/session/${session.id}`)}
          >
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
                    {(session.final_video_url || session.raw_video_url) && (
                      <span className="flex items-center gap-1">
                        <Video className="h-4 w-4" />
                        Video Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="glass-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/session/${session.id}`);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default RecordingSession;

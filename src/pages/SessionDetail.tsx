import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Clock, Calendar, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success border-success/30';
      case 'recording':
      case 'processing':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'error':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The recording session you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const videoUrl = session.final_video_url || session.raw_video_url || session.daily_download_url;

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground mt-1">Brand: {session.brand_id.toUpperCase()}</p>
          </div>
          <Badge className={getStatusColor(session.status)}>
            {session.status}
          </Badge>
        </div>

        <VideoPlayer
          videoUrl={videoUrl}
          dailyUrl={session.daily_room_url}
          title={session.title}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Session Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(session.duration_seconds)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(session.created_at!).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {session.transcript_url && (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Transcript</p>
                    <p className="font-medium text-success">Available</p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Downloads</h2>
            
            <div className="space-y-2">
              {session.final_video_url && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={session.final_video_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download Final Video
                  </a>
                </Button>
              )}
              
              {session.raw_video_url && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={session.raw_video_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download Raw Video
                  </a>
                </Button>
              )}
              
              {session.transcript_url && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={session.transcript_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download Transcript
                  </a>
                </Button>
              )}

              {!session.final_video_url && !session.raw_video_url && !session.transcript_url && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No downloads available yet
                </p>
              )}
            </div>
          </GlassCard>
        </div>

        {session.description && (
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-muted-foreground">{session.description}</p>
          </GlassCard>
        )}

        {session.error_message && (
          <GlassCard className="p-6 border-destructive/50">
            <h2 className="text-xl font-semibold text-destructive mb-3">Error</h2>
            <p className="text-destructive/80">{session.error_message}</p>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default SessionDetail;

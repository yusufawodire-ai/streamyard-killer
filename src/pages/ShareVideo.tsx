import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { GlassCard } from "@/components/ui/glass-card";
import { Calendar, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";

export default function ShareVideo() {
  const { shareToken } = useParams();

  const { data: session, isLoading } = useQuery({
    queryKey: ['shared-session', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shareToken,
  });

  // Increment view count
  useEffect(() => {
    if (session?.id) {
      supabase
        .from('sessions')
        .update({ view_count: (session.view_count || 0) + 1 })
        .eq('id', session.id)
        .then();
    }
  }, [session?.id]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <GlassCard className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
          <p className="text-muted-foreground">
            This video may have been removed or the link has expired.
          </p>
        </GlassCard>
      </div>
    );
  }

  const videoUrl = session.final_video_url || session.raw_video_url;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
            {session.description && (
              <p className="text-muted-foreground">{session.description}</p>
            )}
          </div>

          <VideoPlayer 
            videoUrl={videoUrl}
            title={session.title}
          />

          <GlassCard className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Recorded</p>
                  <p className="font-medium">
                    {session.recorded_at 
                      ? format(new Date(session.recorded_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(session.duration_seconds)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="font-medium">{session.view_count || 0}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

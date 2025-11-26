import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Clock, Calendar, FileText, Share2, AlertCircle, Trash2, RefreshCw, Loader2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareModal } from "@/components/ShareModal";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isStartingTranscription, setIsStartingTranscription] = useState(false);
  const { toast } = useToast();

  // Query for transcript data with auto-polling when processing
  const { data: transcripts, refetch: refetchTranscripts } = useQuery({
    queryKey: ['transcripts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: session, isLoading, refetch } = useQuery({
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
    refetchInterval: (query) => {
      // Auto-refetch every 30 seconds if recording, processing, or uploading
      const status = query.state.data?.status;
      if (status === 'recording' || status === 'processing' || status === 'uploading') {
        return 30000; // 30 seconds
      }
      return false;
    },
  });

  // Real-time subscription for instant updates when webhook fires
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`session-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Session updated via webhook:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);


  const handleStartTranscription = async () => {
    if (!id) return;
    
    setIsStartingTranscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-transcription', {
        body: { session_id: id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Transcription Started",
        description: "Transcription is being processed. This will take a few minutes.",
      });
      
      // Refetch to show transcribing status
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Failed to Start Transcription",
        description: error instanceof Error ? error.message : "Failed to start transcription",
        variant: "destructive",
      });
    } finally {
      setIsStartingTranscription(false);
    }
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!id) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this recording? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Session Deleted",
        description: "Recording session has been permanently deleted",
      });
      
      navigate('/');
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
      case 'completed':
        return 'bg-success/20 text-success border-success/30';
      case 'recorded':
      case 'uploading':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'recording':
      case 'processing':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'error':
      case 'failed':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'recording':
        return 'Recording in progress...';
      case 'processing':
        return 'Processing recording...';
      case 'uploading':
        return 'Uploading to storage...';
      case 'completed':
        return 'Ready';
      case 'recorded':
        return 'Recording ready';
      case 'draft':
        return 'Waiting for recording to start';
      default:
        return status;
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

  const videoUrl = session.final_video_url || session.raw_video_url;

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
            {getStatusMessage(session.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSession}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>

        {session.status === 'recording' && (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              Recording is in progress. The video will appear here once the recording is complete.
            </AlertDescription>
          </Alert>
        )}

        {session.status === 'processing' && (
          <Alert className="border-warning/50 bg-warning/10">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-4 w-4 text-warning animate-spin mt-0.5" />
              <div className="flex-1">
                <AlertDescription className="text-warning-foreground font-medium mb-1">
                  Processing your recording
                </AlertDescription>
                <AlertDescription className="text-warning-foreground/80 text-sm">
                  Your video is being processed. This usually takes a few minutes.
                  <span className="font-medium"> Page refreshes every 30 seconds.</span>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {session.status === 'uploading' && (
          <Alert className="border-warning/50 bg-warning/10">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-4 w-4 text-warning animate-spin mt-0.5" />
              <div className="flex-1">
                <AlertDescription className="text-warning-foreground font-medium mb-1">
                  Uploading to storage
                </AlertDescription>
                <AlertDescription className="text-warning-foreground/80 text-sm">
                  Your video is being uploaded to Supabase Storage. This may take a few minutes depending on video size.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {session.status === 'draft' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Waiting for recording to start. Click "Start Recording" to begin.
            </AlertDescription>
          </Alert>
        )}

        <VideoPlayer
          videoUrl={videoUrl}
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

        {/* Transcript Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcript
            </h2>
            {session.status === 'recorded' && !transcripts?.length && (
              <Button 
                onClick={handleStartTranscription}
                disabled={isStartingTranscription}
                size="sm"
              >
                {isStartingTranscription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Generate Transcript
                  </>
                )}
              </Button>
            )}
          </div>

          {transcripts && transcripts.length > 0 ? (
            transcripts.map((transcript) => (
              <div key={transcript.id} className="space-y-3">
                {transcript.status === 'pending' || transcript.status === 'processing' ? (
                  <Alert className="border-warning/50 bg-warning/10">
                    <RefreshCw className="h-4 w-4 text-warning animate-spin" />
                    <AlertDescription className="text-warning-foreground">
                      Transcription in progress... This usually takes 2-5 minutes.
                    </AlertDescription>
                  </Alert>
                ) : transcript.status === 'completed' && transcript.full_text ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-success/20 text-success border-success/30">
                        Completed
                      </Badge>
                      {transcript.word_count && (
                        <span className="text-sm text-muted-foreground">
                          {transcript.word_count} words
                        </span>
                      )}
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {transcript.full_text}
                      </p>
                    </div>
                  </>
                ) : transcript.status === 'failed' ? (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      Transcription failed: {transcript.error_message || 'Unknown error'}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {session.status === 'recorded' 
                ? "Click 'Generate Transcript' to start transcription"
                : "Transcript will be available after recording is complete"}
            </p>
          )}
        </GlassCard>

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

        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          sessionId={session.id}
          shareToken={session.share_token}
          isPublic={session.is_public}
          onShareToggle={() => refetch()}
        />
      </motion.div>
    </div>
  );
};

export default SessionDetail;

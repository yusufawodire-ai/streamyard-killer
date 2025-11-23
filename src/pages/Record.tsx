import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import Daily from "@daily-co/daily-js";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CustomRecordingControls } from "@/components/CustomRecordingControls";

const Record = () => {
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const dailyFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomUrl && !callFrame && dailyFrameRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully ready
      const container = dailyFrameRef.current;
      
      requestAnimationFrame(() => {
        if (!container) {
          console.error('Daily frame container not found');
          return;
        }

        try {
          const frame = Daily.createFrame(container, {
            showLeaveButton: true,
            showFullscreenButton: true,
          });
          
          frame.join({ url: roomUrl });
          setCallFrame(frame);

          frame.on('left-meeting', handleLeaveCall);
          
          // Auto-start recording when joined
          frame.on('joined-meeting', async () => {
            try {
              await frame.startRecording();
              setIsRecording(true);
              toast({
                title: "Recording Started",
                description: "Your session is now being recorded",
              });
            } catch (error) {
              console.error('Failed to start recording:', error);
              toast({
                title: "Recording Failed",
                description: error instanceof Error ? error.message : "Failed to start recording",
                variant: "destructive",
              });
            }
          });

          frame.on('recording-started', () => {
            setIsRecording(true);
          });

          frame.on('recording-stopped', () => {
            setIsRecording(false);
          });
        } catch (error) {
          console.error('Error creating Daily frame:', error);
          toast({
            title: "Connection Error",
            description: "Failed to initialize video call. Please try again.",
            variant: "destructive",
          });
        }
      });
    }

    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [roomUrl]);

  // Recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleCreateSession = async () => {
    if (!brandId || !title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a brand and enter a title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-recording-session', {
        body: {
          brand_id: brandId,
          title: title.trim(),
          description: null,
        },
      });

      if (error) throw error;

      setRoomUrl(data.room_url);
      setSessionId(data.session_id);

      toast({
        title: "Room Created",
        description: "Your recording room is ready!",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create recording session",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStopRecording = async () => {
    if (callFrame && isRecording) {
      try {
        await callFrame.stopRecording();
        toast({
          title: "Recording Stopped",
          description: "Your recording has been saved",
        });
      } catch (error) {
        console.error('Failed to stop recording:', error);
        toast({
          title: "Error",
          description: "Failed to stop recording",
          variant: "destructive",
        });
      }
    }
  };

  const handleLeaveCall = () => {
    if (callFrame) {
      callFrame.destroy();
      setCallFrame(null);
    }
    toast({
      title: "Recording Ended",
      description: "Your recording is being processed.",
    });
    setRoomUrl(null);
    setIsRecording(false);
    if (sessionId) {
      navigate(`/session/${sessionId}`);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (roomUrl) {
    return (
      <div className="min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
            </div>
            <div className="flex gap-2">
              {isRecording && (
                <Button variant="outline" onClick={handleStopRecording}>
                  Stop Recording
                </Button>
              )}
              <Button variant="destructive" onClick={handleLeaveCall}>
                <X className="mr-2 h-4 w-4" />
                End Session
              </Button>
            </div>
          </div>
          
          <GlassCard className="p-0 overflow-hidden relative">
            <CustomRecordingControls 
              isRecording={isRecording}
              duration={recordingDuration}
              sessionTitle={title}
            />
            <div 
              ref={dailyFrameRef}
              className="aspect-video bg-black"
              style={{ width: '100%', minHeight: '600px' }}
            />
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Start Recording</h1>
            <p className="text-muted-foreground">
              Create a new recording session for your brand
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger id="brand">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssv">SSV</SelectItem>
                  <SelectItem value="pco">PCO</SelectItem>
                  <SelectItem value="meo">MEO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Recording Title *</Label>
              <Input
                id="title"
                placeholder="Enter recording title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <Button 
              onClick={handleCreateSession} 
              disabled={isCreating}
              className="w-full h-14 text-lg"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Room...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-5 w-5" />
                  Start Recording
                </>
              )}
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Record;

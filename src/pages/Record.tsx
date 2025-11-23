import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Square, Play, Pause, Upload, Eye, EyeOff, MoveUpLeft, MoveUpRight, MoveDownLeft, MoveDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import RecordingSettings from "@/components/RecordingSettings";
import WebcamPositionControl from "@/components/WebcamPositionControl";
import { RecordingConfig } from "@/types/recording";

const Record = () => {
  const [currentStep, setCurrentStep] = useState<'setup' | 'settings' | 'recording'>('setup');
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isWebcamVisibleState, setIsWebcamVisibleState] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, uploadRecording, updateWebcamPosition, toggleWebcamVisibility, isWebcamVisible } = useScreenRecorder();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleWebcam = () => {
    if (toggleWebcamVisibility) {
      const newState = toggleWebcamVisibility();
      setIsWebcamVisibleState(newState);
      toast({
        title: newState ? "Webcam Visible" : "Webcam Hidden",
        description: `Webcam overlay is now ${newState ? 'visible' : 'hidden'}`,
      });
    }
  };

  const handlePositionChange = (position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => {
    updateWebcamPosition(position);
    toast({
      title: "Position Updated",
      description: `Webcam moved to ${position.replace('-', ' ')}`,
    });
  };

  const handleContinueToSettings = () => {
    if (!brandId || !title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a brand and enter a title",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('settings');
  };

  const handleStartRecording = async (config: RecordingConfig) => {
    setIsCreating(true);
    setRecordingConfig(config);

    try {
      // Create session in database
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          brand_id: brandId,
          title: title.trim(),
          status: 'recording',
          recording_metadata: config as any,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setCurrentStep('recording');

      // Start screen recording with config
      await startRecording(config);

      toast({
        title: "Recording Started",
        description: `Recording in ${config.mode} mode`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start recording",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStopRecording = async () => {
    if (!sessionId) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Stop recording and get blob
      const blob = await stopRecording();
      setUploadProgress(30);

      // Upload to Supabase Storage
      const videoUrl = await uploadRecording(blob, sessionId, brandId);
      setUploadProgress(70);

      // Update session with video URL
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          final_video_url: videoUrl,
          status: 'recorded',
          recorded_at: new Date().toISOString(),
          duration_seconds: state.duration,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      setUploadProgress(90);

      // Start transcription
      await supabase.functions.invoke('start-transcription', {
        body: { session_id: sessionId },
      });

      setUploadProgress(100);

      toast({
        title: "Recording Complete",
        description: "Your video is ready and transcription has started",
      });

      // Navigate to session detail
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process recording",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Show settings step
  if (currentStep === 'settings') {
    return (
      <RecordingSettings
        brandId={brandId}
        title={title}
        onBack={() => setCurrentStep('setup')}
        onStartRecording={handleStartRecording}
      />
    );
  }

  // Show recording interface
  if (currentStep === 'recording' && (state.isRecording || isUploading)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <GlassCard className="p-8 text-center space-y-6">
            {isUploading ? (
              <>
                <Upload className="h-16 w-16 mx-auto text-primary animate-pulse" />
                <h2 className="text-2xl font-bold">Processing Recording</h2>
                <p className="text-muted-foreground">
                  Uploading your video and starting transcription...
                </p>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-4">
                  <Badge variant="destructive" className="px-4 py-2 text-lg animate-pulse">
                    <div className="h-3 w-3 bg-white rounded-full mr-2 animate-pulse" />
                    REC {formatDuration(state.duration)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{title}</h2>
                  <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  {state.isPaused ? (
                    <Button onClick={resumeRecording} size="lg" variant="outline">
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                  ) : (
                    <Button onClick={pauseRecording} size="lg" variant="outline">
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                  )}
                  <Button onClick={handleStopRecording} size="lg" variant="destructive">
                    <Square className="mr-2 h-5 w-5" />
                    Stop & Save
                  </Button>
                </div>

                {/* Webcam Controls - Only show for screen-webcam mode */}
                {recordingConfig?.mode === 'screen-webcam' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="fixed top-6 right-6 z-[9999] space-y-2"
                  >
                    {/* Hide/Show Button */}
                    <GlassCard className="p-3">
                      <Button
                        variant={isWebcamVisibleState ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleWebcam}
                        className="w-full"
                      >
                        {isWebcamVisibleState ? (
                          <><Eye className="h-4 w-4 mr-2" />Hide Webcam</>
                        ) : (
                          <><EyeOff className="h-4 w-4 mr-2" />Show Webcam</>
                        )}
                      </Button>
                    </GlassCard>

                    {/* Position Controls - Only show when webcam is visible */}
                    {isWebcamVisibleState && (
                      <GlassCard className="p-3">
                        <h4 className="text-xs font-semibold mb-2 text-center">Webcam Position</h4>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            size="sm"
                            variant={recordingConfig.webcam?.position === 'top-left' ? 'default' : 'outline'}
                            onClick={() => handlePositionChange('top-left')}
                            className="p-2"
                          >
                            <MoveUpLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={recordingConfig.webcam?.position === 'top-right' ? 'default' : 'outline'}
                            onClick={() => handlePositionChange('top-right')}
                            className="p-2"
                          >
                            <MoveUpRight className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={recordingConfig.webcam?.position === 'bottom-left' ? 'default' : 'outline'}
                            onClick={() => handlePositionChange('bottom-left')}
                            className="p-2"
                          >
                            <MoveDownLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={recordingConfig.webcam?.position === 'bottom-right' ? 'default' : 'outline'}
                            onClick={() => handlePositionChange('bottom-right')}
                            className="p-2"
                          >
                            <MoveDownRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </GlassCard>
                    )}
                  </motion.div>
                )}

                <p className="text-sm text-muted-foreground">
                  Your screen is being recorded. Click "Stop & Save" when finished.
                </p>
              </>
            )}
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Show initial setup form
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
              Record your screen with audio
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
              onClick={handleContinueToSettings} 
              disabled={isCreating}
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Video className="mr-2 h-5 w-5" />
              Continue to Settings
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Record;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Square, Play, Pause, Upload, Eye, EyeOff, MoveUpLeft, MoveUpRight, MoveDownLeft, MoveDownRight, Minimize2, Plus, Minus, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import RecordingSettings from "@/components/RecordingSettings";
import WebcamPositionControl from "@/components/WebcamPositionControl";
import ScreenAreaSelector from "@/components/ScreenAreaSelector";
import { RecordingConfig, CropSettings } from "@/types/recording";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { AISuggestionsPanel, AISuggestion } from "@/components/AISuggestionsPanel";

const Record = () => {
  const [currentStep, setCurrentStep] = useState<'setup' | 'area-selection' | 'settings' | 'recording'>('setup');
  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isWebcamVisibleState, setIsWebcamVisibleState] = useState(true);
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [controlsPosition, setControlsPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [pauseTranscript, setPauseTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, uploadRecording, updateWebcamPosition, updateWebcamSize, toggleWebcamVisibility, isWebcamVisible } = useScreenRecorder();

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

  const handleSizeChange = (delta: number) => {
    const currentSize = recordingConfig?.webcam?.size || 15;
    const newSize = Math.max(10, Math.min(30, currentSize + delta));
    updateWebcamSize(newSize);
    
    setRecordingConfig(prev => ({
      ...prev!,
      webcam: { ...prev!.webcam!, size: newSize }
    }));
    
    toast({
      title: "Size Updated",
      description: `Webcam size: ${newSize}%`,
    });
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    const startX = e.clientX - controlsPosition.x;
    const startY = e.clientY - controlsPosition.y;

    const handleDragMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - startX;
      const newY = moveEvent.clientY - startY;
      
      const maxX = window.innerWidth - 340;
      const maxY = window.innerHeight - 400;
      
      setControlsPosition({
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

  const handleContinueToAreaSelection = () => {
    if (!brandId || !title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a brand and enter a title",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('area-selection');
  };

  const handleContinueToSettings = (crop: CropSettings) => {
    setCropSettings(crop);
    setCurrentStep('settings');
  };

  const handleStartRecording = async (config: RecordingConfig) => {
    setIsCreating(true);
    
    // Add crop settings to config
    const finalConfig = {
      ...config,
      crop: cropSettings || undefined,
    };
    setRecordingConfig(finalConfig);

    try {
      // Create session in database
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          brand_id: brandId,
          title: title.trim(),
          status: 'recording',
          recording_metadata: finalConfig as any,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setCurrentStep('recording');

      // Start screen recording with config
      await startRecording(finalConfig);

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

  const uploadPartialVideo = async (blob: Blob, sessionId: string): Promise<string> => {
    const fileName = `${brandId}/${sessionId}_partial_${Date.now()}.webm`;
    
    const { error } = await supabase.storage
      .from('final-videos')
      .upload(fileName, blob, {
        contentType: 'video/webm',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('final-videos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handlePause = async () => {
    setIsTranscribing(true);
    setPauseTranscript(null);
    setAiSuggestions([]);
    
    try {
      // 1. Pause and get current blob
      const partialBlob = await pauseRecording();
      
      if (!partialBlob || !sessionId) {
        toast({
          title: "Error",
          description: "Could not capture recording for transcription",
          variant: "destructive",
        });
        setIsTranscribing(false);
        return;
      }

      // 2. Upload to temp storage
      const tempUrl = await uploadPartialVideo(partialBlob, sessionId);
      
      // 3. Call Whisper transcription
      const { data, error } = await supabase.functions.invoke('start-transcription', {
        body: { 
          session_id: sessionId,
          video_url: tempUrl,
          is_partial: true,
        }
      });
      
      if (error) throw error;
      
      if (data?.text) {
        setPauseTranscript(data.text);
        toast({
          title: "Transcript Ready",
          description: "Your transcript is available in the panel",
        });

        // 4. Generate AI suggestions based on transcript
        setIsGeneratingSuggestions(true);
        try {
          const { data: suggestionsData, error: suggestionsError } = await supabase.functions.invoke('ai-suggestions', {
            body: {
              transcript: data.text,
              context: {
                brand: brandId,
                title: title,
              }
            }
          });

          if (suggestionsError) {
            console.error('AI suggestions error:', suggestionsError);
          } else if (suggestionsData?.suggestions) {
            setAiSuggestions(suggestionsData.suggestions);
            toast({
              title: "AI Suggestions Ready",
              description: `${suggestionsData.suggestions.length} suggestions generated`,
            });
          }
        } catch (suggestionsErr) {
          console.error('Error generating suggestions:', suggestionsErr);
        } finally {
          setIsGeneratingSuggestions(false);
        }
      }
    } catch (error) {
      console.error('Error transcribing:', error);
      toast({
        title: "Transcription Error",
        description: error instanceof Error ? error.message : "Failed to generate transcript",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRegenerateSuggestions = async () => {
    if (!pauseTranscript) return;
    
    setIsGeneratingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggestions', {
        body: {
          transcript: pauseTranscript,
          context: {
            brand: brandId,
            title: title,
          }
        }
      });

      if (error) throw error;
      
      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
        toast({
          title: "Suggestions Updated",
          description: `${data.suggestions.length} new suggestions generated`,
        });
      }
    } catch (error) {
      console.error('Error regenerating suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleToggleSuggestionCovered = (id: number) => {
    setAiSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, covered: !s.covered } : s)
    );
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

      setUploadProgress(100);

      toast({
        title: "Recording Complete",
        description: "Your video is ready! You can transcribe it from the session page.",
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

  // Show area selection step
  if (currentStep === 'area-selection') {
    return (
      <ScreenAreaSelector
        onContinue={handleContinueToSettings}
        onBack={() => setCurrentStep('setup')}
      />
    );
  }

  // Show settings step
  if (currentStep === 'settings') {
    return (
      <RecordingSettings
        brandId={brandId}
        title={title}
        onBack={() => setCurrentStep('area-selection')}
        onStartRecording={handleStartRecording}
      />
    );
  }

  // Show recording interface
  if (currentStep === 'recording' && (state.isRecording || isUploading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Main centered recording status card */}
        <div className="flex items-center justify-center min-h-screen p-6">
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
                      <Button onClick={handlePause} size="lg" variant="outline">
                        <Pause className="mr-2 h-5 w-5" />
                        Pause
                      </Button>
                    )}
                    <Button onClick={handleStopRecording} size="lg" variant="destructive">
                      <Square className="mr-2 h-5 w-5" />
                      Stop & Save
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Your screen is being recorded. Click "Stop & Save" when finished.
                  </p>
                </>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Draggable Control Panel - OUTSIDE centered container, SIBLING to it */}
        {!isUploading && (
          <>
          {/* Collapsed Button */}
          {!isControlsExpanded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'fixed',
                          top: controlsPosition.y || 20,
                          left: controlsPosition.x || 20,
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
                              setIsControlsExpanded(true);
                            }}
                          >
                            <Badge variant="destructive" className="animate-pulse mr-2">
                              <div className="h-2 w-2 bg-white rounded-full" />
                            </Badge>
                            {formatDuration(state.duration)}
                          </Button>
                        </GlassCard>
                      </motion.div>
                    )}

                    {/* Expanded Control Panel */}
                    {isControlsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          position: 'fixed',
                          top: controlsPosition.y || 20,
                          left: controlsPosition.x || (window.innerWidth / 2 - 160),
                          zIndex: 10001,
                        }}
                        className="pointer-events-auto"
                      >
                        <GlassCard className="w-[320px]">
                          {/* Drag Handle Header */}
                           <div 
                            className={`p-2 bg-muted/50 rounded-t-lg select-none flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            onMouseDown={handleDragStart}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-semibold">Recording Controls</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsControlsExpanded(false);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Minimize2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="p-3 space-y-2">
                            {/* Webcam-Specific Controls - Only for screen-webcam mode */}
                            {recordingConfig?.mode === 'screen-webcam' && (
                              <>
                                {/* Hide/Show Webcam */}
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

                                {/* Webcam Size Control */}
                                {isWebcamVisibleState && (
                                  <GlassCard className="p-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs">Webcam Size</Label>
                                        <span className="text-xs font-mono">
                                          {recordingConfig.webcam?.size || 15}%
                                        </span>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSizeChange(-1)}
                                          disabled={!recordingConfig.webcam || recordingConfig.webcam.size <= 10}
                                          className="flex-1"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSizeChange(1)}
                                          disabled={!recordingConfig.webcam || recordingConfig.webcam.size >= 30}
                                          className="flex-1"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </GlassCard>
                                )}

                                {/* Position Controls */}
                                {isWebcamVisibleState && (
                                  <GlassCard className="p-3">
                                    <Label className="text-xs mb-2 block">Webcam Position</Label>
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
                              </>
                            )}

                            {/* Toggle Preview - Always visible */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const canvas = document.querySelector('canvas');
                                if (canvas) {
                                  canvas.style.display = canvas.style.display === 'none' ? 'block' : 'none';
                                }
                                toast({
                                  title: canvas?.style.display === 'none' ? "Preview Shown" : "Preview Hidden",
                                });
                              }}
                              className="w-full"
                            >
                              Toggle Preview
                            </Button>
                          </div>
                         </GlassCard>
                      </motion.div>
                     )}
                   </>
                 )}

                  {/* Transcript Panel - Show when transcript is available or loading */}
                  {(pauseTranscript || isTranscribing) && (
                    <TranscriptPanel
                      transcript={pauseTranscript}
                      isLoading={isTranscribing}
                    />
                  )}

                  {/* AI Suggestions Panel - Show when suggestions are available or loading */}
                  {(aiSuggestions.length > 0 || isGeneratingSuggestions) && (
                    <AISuggestionsPanel
                      suggestions={aiSuggestions}
                      isLoading={isGeneratingSuggestions}
                      onRegenerate={handleRegenerateSuggestions}
                      onToggleCovered={handleToggleSuggestionCovered}
                    />
                  )}
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
              onClick={handleContinueToAreaSelection} 
              disabled={isCreating}
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Video className="mr-2 h-5 w-5" />
              Continue to Area Selection
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Record;

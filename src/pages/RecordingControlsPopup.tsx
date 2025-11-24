import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Eye, EyeOff, MoveUpLeft, MoveUpRight, MoveDownLeft, MoveDownRight, Plus, Minus } from 'lucide-react';
import { useRecordingSync } from '@/hooks/useRecordingSync';
import { Label } from '@/components/ui/label';

const RecordingControlsPopup = () => {
  const { state, sendCommand } = useRecordingSync(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set popup window title
    document.title = 'Recording Controls';
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = () => {
    if (state?.isPaused) {
      sendCommand({ type: 'resume' });
    } else {
      sendCommand({ type: 'pause' });
    }
  };

  const handleStop = () => {
    sendCommand({ type: 'stop' });
  };

  const handleToggleWebcam = () => {
    sendCommand({ type: 'toggle-webcam' });
  };

  const handlePositionChange = (position: string) => {
    sendCommand({ type: 'update-webcam-position', payload: position });
  };

  const handleSizeChange = (delta: number) => {
    sendCommand({ type: 'update-webcam-size', payload: delta });
  };

  if (!mounted || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Connecting to recording session...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <GlassCard className="p-4">
          <div className="text-center space-y-2">
            <Badge variant="destructive" className="px-4 py-2 text-lg animate-pulse">
              <div className="h-3 w-3 bg-white rounded-full mr-2 animate-pulse" />
              REC {formatDuration(state.duration)}
            </Badge>
            <h2 className="text-xl font-bold">{state.title}</h2>
            <p className="text-xs text-muted-foreground">Mode: {state.mode}</p>
          </div>
        </GlassCard>

        {/* Upload Progress */}
        {state.isUploading && (
          <GlassCard className="p-4">
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold">Uploading...</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{state.uploadProgress}%</p>
            </div>
          </GlassCard>
        )}

        {/* Main Controls */}
        {!state.isUploading && (
          <GlassCard className="p-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  onClick={handlePauseResume} 
                  size="lg" 
                  variant="outline"
                  className="flex-1"
                >
                  {state.isPaused ? (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleStop} 
                  size="lg" 
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Webcam Controls - Only show for screen-webcam mode */}
        {state.mode === 'screen-webcam' && !state.isUploading && (
          <GlassCard className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold mb-2">Webcam Controls</h3>
              
              {/* Toggle Webcam Visibility */}
              <Button
                variant={state.isWebcamVisible ? "default" : "outline"}
                size="sm"
                onClick={handleToggleWebcam}
                className="w-full"
              >
                {state.isWebcamVisible ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Hide Webcam
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Show Webcam
                  </>
                )}
              </Button>

              {/* Size Control */}
              {state.isWebcamVisible && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Webcam Size</Label>
                    <span className="text-xs font-mono">{state.webcamSize || 15}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSizeChange(-1)}
                      disabled={(state.webcamSize || 15) <= 10}
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSizeChange(1)}
                      disabled={(state.webcamSize || 15) >= 30}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Position Controls */}
              {state.isWebcamVisible && (
                <div className="space-y-2">
                  <Label className="text-xs">Webcam Position</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={state.webcamPosition === 'top-left' ? 'default' : 'outline'}
                      onClick={() => handlePositionChange('top-left')}
                      className="p-3"
                    >
                      <MoveUpLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={state.webcamPosition === 'top-right' ? 'default' : 'outline'}
                      onClick={() => handlePositionChange('top-right')}
                      className="p-3"
                    >
                      <MoveUpRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={state.webcamPosition === 'bottom-left' ? 'default' : 'outline'}
                      onClick={() => handlePositionChange('bottom-left')}
                      className="p-3"
                    >
                      <MoveDownLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={state.webcamPosition === 'bottom-right' ? 'default' : 'outline'}
                      onClick={() => handlePositionChange('bottom-right')}
                      className="p-3"
                    >
                      <MoveDownRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Info */}
        <div className="text-center text-xs text-muted-foreground">
          <p>This window controls your recording session.</p>
          <p>You can switch tabs while recording.</p>
        </div>
      </div>
    </div>
  );
};

export default RecordingControlsPopup;

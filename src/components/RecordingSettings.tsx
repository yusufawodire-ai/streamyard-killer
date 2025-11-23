import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/ui/glass-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Monitor, 
  Camera, 
  Mic, 
  Video, 
  ArrowLeft,
  Circle,
  Square,
  RectangleHorizontal
} from "lucide-react";
import { RecordingConfig, RecordingMode, Resolution, FrameRate, WebcamPosition, WebcamShape } from "@/types/recording";
import { getAvailableDevices, RESOLUTION_PRESETS, testDeviceAccess } from "@/utils/mediaDevices";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface RecordingSettingsProps {
  brandId: string;
  title: string;
  onBack: () => void;
  onStartRecording: (config: RecordingConfig) => void;
}

const DEFAULT_CONFIG: RecordingConfig = {
  mode: 'screen',
  resolution: {
    label: '1080p',
    width: 1920,
    height: 1080,
  },
  frameRate: 30,
  audioBitrate: 128000,
  webcam: {
    position: 'bottom-right',
    size: 20,
    shape: 'circle',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
};

const RecordingSettings = ({ brandId, title, onBack, onStartRecording }: RecordingSettingsProps) => {
  const [config, setConfig] = useState<RecordingConfig>(DEFAULT_CONFIG);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [microphones, setMicrophones] = useState<Array<{ id: string; label: string }>>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const micLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      setIsLoadingDevices(true);
      const devices = await getAvailableDevices();
      setCameras(devices.cameras);
      setMicrophones(devices.microphones);
      
      // Set default devices
      if (devices.cameras.length > 0) {
        setConfig(prev => ({ ...prev, cameraDeviceId: devices.cameras[0].id }));
      }
      if (devices.microphones.length > 0) {
        setConfig(prev => ({ ...prev, microphoneDeviceId: devices.microphones[0].id }));
      }
      
      setIsLoadingDevices(false);
    };
    
    loadDevices();
  }, []);

  // Start camera preview when camera is selected
  useEffect(() => {
    if (config.cameraDeviceId && (config.mode === 'screen-webcam' || config.mode === 'webcam')) {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
    
    return () => stopCameraPreview();
  }, [config.cameraDeviceId, config.mode]);

  const startCameraPreview = async () => {
    try {
      stopCameraPreview();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: config.cameraDeviceId ? { exact: config.cameraDeviceId } : undefined },
        audio: false,
      });
      
      setPreviewStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Failed to start camera preview:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCameraPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
  };

  const handleTestMicrophone = async () => {
    if (isTestingMic) {
      // Stop testing
      setIsTestingMic(false);
      setMicLevel(0);
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
      }
      if (micLevelIntervalRef.current) {
        clearInterval(micLevelIntervalRef.current);
        micLevelIntervalRef.current = null;
      }
    } else {
      // Start testing
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: config.microphoneDeviceId ? { exact: config.microphoneDeviceId } : undefined },
          video: false,
        });
        
        setMicStream(stream);
        setIsTestingMic(true);
        
        // Measure audio levels
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        micLevelIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const level = Math.round((average / 255) * 100);
          setMicLevel(level);
        }, 100);
        
      } catch (error) {
        console.error('Failed to test microphone:', error);
        toast({
          title: "Microphone Error",
          description: "Failed to access microphone. Please check permissions.",
          variant: "destructive",
        });
      }
    }
  };

  const handleStart = () => {
    stopCameraPreview();
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
    }
    onStartRecording(config);
  };

  const updateConfig = (updates: Partial<RecordingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateWebcamConfig = (updates: Partial<NonNullable<RecordingConfig['webcam']>>) => {
    setConfig(prev => ({
      ...prev,
      webcam: { ...prev.webcam!, ...updates },
    }));
  };

  const setResolution = (label: Resolution) => {
    const preset = RESOLUTION_PRESETS[label];
    updateConfig({
      resolution: { label, ...preset },
    });
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <GlassCard className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Recording Settings</h1>
              <p className="text-muted-foreground">{title}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Settings */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Recording Mode */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Recording Mode</Label>
                <RadioGroup 
                  value={config.mode} 
                  onValueChange={(value) => updateConfig({ mode: value as RecordingMode })}
                  className="grid grid-cols-3 gap-4"
                >
                  <label htmlFor="screen" className="cursor-pointer">
                    <div className={`p-6 rounded-lg border-2 transition-all ${
                      config.mode === 'screen' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="screen" id="screen" className="sr-only" />
                      <Monitor className="h-8 w-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold text-center mb-1">Screen Only</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        Record your screen
                      </p>
                    </div>
                  </label>

                  <label htmlFor="screen-webcam" className="cursor-pointer">
                    <div className={`p-6 rounded-lg border-2 transition-all ${
                      config.mode === 'screen-webcam' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="screen-webcam" id="screen-webcam" className="sr-only" />
                      <div className="flex justify-center gap-2 mb-3">
                        <Monitor className="h-6 w-6 text-primary" />
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-center mb-1">Screen + Webcam</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        With webcam overlay
                      </p>
                      <Badge variant="secondary" className="mt-2 w-full justify-center text-xs">
                        Phase 2
                      </Badge>
                    </div>
                  </label>

                  <label htmlFor="webcam" className="cursor-pointer">
                    <div className={`p-6 rounded-lg border-2 transition-all ${
                      config.mode === 'webcam' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="webcam" id="webcam" className="sr-only" />
                      <Camera className="h-8 w-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold text-center mb-1">Webcam Only</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        Record camera
                      </p>
                      <Badge variant="secondary" className="mt-2 w-full justify-center text-xs">
                        Phase 2
                      </Badge>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Device Selection */}
              {(config.mode === 'screen-webcam' || config.mode === 'webcam') && (
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Camera</Label>
                  <Select 
                    value={config.cameraDeviceId} 
                    onValueChange={(value) => updateConfig({ cameraDeviceId: value })}
                    disabled={isLoadingDevices || cameras.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map(camera => (
                        <SelectItem key={camera.id} value={camera.id}>
                          {camera.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4">
                <Label className="text-lg font-semibold">Microphone</Label>
                <div className="flex gap-2">
                  <Select 
                    value={config.microphoneDeviceId} 
                    onValueChange={(value) => updateConfig({ microphoneDeviceId: value })}
                    disabled={isLoadingDevices || microphones.length === 0}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {microphones.map(mic => (
                        <SelectItem key={mic.id} value={mic.id}>
                          {mic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant={isTestingMic ? "destructive" : "outline"}
                    onClick={handleTestMicrophone}
                    disabled={!config.microphoneDeviceId}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {isTestingMic ? 'Stop' : 'Test'}
                  </Button>
                </div>
                {isTestingMic && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={micLevel} className="flex-1" />
                      <span className="text-sm font-medium w-12 text-right">{micLevel}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Speak into your microphone to test the audio level
                    </p>
                  </div>
                )}
              </div>

              {/* Quality Settings */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Quality Settings</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <Select value={config.resolution.label} onValueChange={(value) => setResolution(value as Resolution)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p (1280x720)</SelectItem>
                        <SelectItem value="1080p">1080p (1920x1080) ⭐</SelectItem>
                        <SelectItem value="1440p">1440p (2560x1440)</SelectItem>
                        <SelectItem value="4k">4K (3840x2160)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Frame Rate</Label>
                    <Select value={config.frameRate.toString()} onValueChange={(value) => updateConfig({ frameRate: parseInt(value) as FrameRate })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                        <SelectItem value="30">30 fps (Standard) ⭐</SelectItem>
                        <SelectItem value="60">60 fps (Smooth)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Audio Quality</Label>
                  <Select value={config.audioBitrate.toString()} onValueChange={(value) => updateConfig({ audioBitrate: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128000">Standard (128 kbps) ⭐</SelectItem>
                      <SelectItem value="192000">High (192 kbps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Webcam Overlay Settings */}
              {config.mode === 'screen-webcam' && (
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <Label className="text-lg font-semibold">Webcam Overlay Settings</Label>
                  <Badge variant="secondary" className="mb-2">Phase 2 - UI Preview Only</Badge>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-3 block">Position</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as WebcamPosition[]).map(pos => (
                          <Button
                            key={pos}
                            variant={config.webcam?.position === pos ? "default" : "outline"}
                            onClick={() => updateWebcamConfig({ position: pos })}
                            className="h-12"
                          >
                            {pos.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Size: {config.webcam?.size}%</Label>
                      <Slider
                        value={[config.webcam?.size || 20]}
                        onValueChange={([value]) => updateWebcamConfig({ size: value })}
                        min={15}
                        max={25}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="mb-3 block">Shape</Label>
                      <div className="flex gap-2">
                        {[
                          { value: 'circle', icon: Circle, label: 'Circle' },
                          { value: 'square', icon: Square, label: 'Square' },
                          { value: 'rounded', icon: RectangleHorizontal, label: 'Rounded' },
                        ].map(({ value, icon: Icon, label }) => (
                          <Button
                            key={value}
                            variant={config.webcam?.shape === value ? "default" : "outline"}
                            onClick={() => updateWebcamConfig({ shape: value as WebcamShape })}
                            className="flex-1"
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Border Width: {config.webcam?.borderWidth}px</Label>
                      <Slider
                        value={[config.webcam?.borderWidth || 2]}
                        onValueChange={([value]) => updateWebcamConfig({ borderWidth: value })}
                        min={0}
                        max={4}
                        step={2}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Preview</Label>
                
                {(config.mode === 'screen-webcam' || config.mode === 'webcam') ? (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {previewStream ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {isLoadingDevices ? 'Loading camera...' : 'No camera preview'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Screen recording mode</p>
                      <p className="text-xs text-muted-foreground">
                        You'll select your screen when recording starts
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold mb-2">Recording Summary</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>• Mode: <span className="text-foreground font-medium">{config.mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' + ')}</span></p>
                  <p>• Quality: <span className="text-foreground font-medium">{config.resolution.label} @ {config.frameRate}fps</span></p>
                  <p>• Audio: <span className="text-foreground font-medium">{config.audioBitrate / 1000} kbps</span></p>
                  {microphones.find(m => m.id === config.microphoneDeviceId) && (
                    <p>• Mic: <span className="text-foreground font-medium">{microphones.find(m => m.id === config.microphoneDeviceId)?.label}</span></p>
                  )}
                  {cameras.find(c => c.id === config.cameraDeviceId) && config.mode !== 'screen' && (
                    <p>• Camera: <span className="text-foreground font-medium">{cameras.find(c => c.id === config.cameraDeviceId)?.label}</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-8 border-t">
            <Button variant="outline" onClick={onBack} size="lg">
              Back
            </Button>
            <Button onClick={handleStart} size="lg" className="px-8">
              <Video className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default RecordingSettings;

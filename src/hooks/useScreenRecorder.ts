import { useState, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';
import { supabase } from '@/integrations/supabase/client';
import { RecordingConfig, WebcamPosition } from '@/types/recording';
import { calculateVideoBitrate } from '@/utils/mediaDevices';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export const useScreenRecorder = () => {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<RecordingConfig | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamVisibleRef = useRef<boolean>(true);
  const blobChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (config?: RecordingConfig) => {
    try {
      configRef.current = config || null;

      // Determine capture dimensions (full screen for cropping or specified resolution)
      const captureWidth = config?.crop ? 1920 : (config?.resolution.width || 1920);
      const captureHeight = config?.crop ? 1080 : (config?.resolution.height || 1080);

      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: captureWidth },
          height: { ideal: captureHeight },
          frameRate: { ideal: config?.frameRate || 30 }
        },
        audio: false, // We'll get audio from microphone separately
      });

      // Handle different recording modes
      let finalStream: MediaStream;

      if (config?.mode === 'screen-webcam') {
        // Get webcam stream
        const webcamStream = await navigator.mediaDevices.getUserMedia({
          video: config.cameraDeviceId 
            ? { deviceId: { exact: config.cameraDeviceId } }
            : true,
          audio: false,
        });
        webcamStreamRef.current = webcamStream;

        // Get microphone stream
        const micStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: config.microphoneDeviceId
            ? { deviceId: { exact: config.microphoneDeviceId } }
            : true,
        });
        micStreamRef.current = micStream;

        // Create canvas for compositing
        const canvas = document.createElement('canvas');
        // Set canvas to final output dimensions (after crop)
        canvas.width = config.crop 
          ? Math.round((config.crop.width / 100) * config.resolution.width)
          : config.resolution.width;
        canvas.height = config.crop
          ? Math.round((config.crop.height / 100) * config.resolution.height)
          : config.resolution.height;
        canvasRef.current = canvas;
        
        // Style as small corner preview (won't be captured if screen share excludes it)
        canvas.style.position = 'fixed';
        canvas.style.bottom = '80px';
        canvas.style.right = '20px';
        canvas.style.width = '320px';
        canvas.style.height = 'auto';
        canvas.style.maxHeight = '180px';
        canvas.style.zIndex = '10000';
        canvas.style.border = '2px solid hsl(var(--primary))';
        canvas.style.borderRadius = '8px';
        canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        canvas.style.backgroundColor = '#000';
        canvas.style.pointerEvents = 'none'; // Don't block clicks
        canvas.style.opacity = '0.95';
        document.body.appendChild(canvas);
        console.log('✅ Canvas preview added to DOM (corner preview)');
        
        const ctx = canvas.getContext('2d')!;

        // Create video elements
        const screenVideo = document.createElement('video');
        screenVideo.srcObject = screenStream;
        screenVideo.play();
        screenVideoRef.current = screenVideo;

        const webcamVideo = document.createElement('video');
        webcamVideo.srcObject = webcamStream;
        webcamVideo.play();
        webcamVideoRef.current = webcamVideo;

        // Draw frames continuously
        let lastFrameTime = 0;
        const drawFrame = () => {
          if (!canvasRef.current || !configRef.current) return;

          // Safety check: ensure videos have dimensions
          if (screenVideo.videoWidth === 0 || webcamVideo.videoWidth === 0) {
            console.log('Waiting for video dimensions...');
            animationFrameRef.current = requestAnimationFrame(drawFrame);
            return;
          }

          // Frame-skipping optimization: limit to target framerate
          const now = Date.now();
          const frameInterval = 1000 / configRef.current.frameRate;
          if (now - lastFrameTime < frameInterval - 2) {
            animationFrameRef.current = requestAnimationFrame(drawFrame);
            return;
          }
          lastFrameTime = now;

          // Apply cropping if specified
          if (config.crop) {
            // Calculate source crop coordinates
            const sourceWidth = screenVideo.videoWidth;
            const sourceHeight = screenVideo.videoHeight;
            const cropX = Math.round((config.crop.x / 100) * sourceWidth);
            const cropY = Math.round((config.crop.y / 100) * sourceHeight);
            const cropWidth = Math.round((config.crop.width / 100) * sourceWidth);
            const cropHeight = Math.round((config.crop.height / 100) * sourceHeight);

            // Draw cropped screen
            ctx.drawImage(
              screenVideo,
              cropX, cropY, cropWidth, cropHeight,  // Source crop area
              0, 0, canvas.width, canvas.height      // Destination (full canvas)
            );
          } else {
            // Draw screen (full canvas, no crop)
            ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          }

          // Calculate webcam dimensions
          const webcamSize = config.webcam?.size || 20;
          const webcamWidth = canvas.width * (webcamSize / 100);
          const webcamHeight = webcamWidth * (webcamVideo.videoHeight / webcamVideo.videoWidth);

          // Calculate position
          const padding = 20;
          const positions = {
            'bottom-right': { x: canvas.width - webcamWidth - padding, y: canvas.height - webcamHeight - padding },
            'bottom-left': { x: padding, y: canvas.height - webcamHeight - padding },
            'top-right': { x: canvas.width - webcamWidth - padding, y: padding },
            'top-left': { x: padding, y: padding },
          };
          const pos = positions[configRef.current.webcam?.position || 'bottom-right'];

          // Only draw webcam if visible
          if (webcamVisibleRef.current) {
            // Draw border
            if (config.webcam?.borderWidth && config.webcam.borderWidth > 0) {
              ctx.strokeStyle = config.webcam.borderColor;
              ctx.lineWidth = config.webcam.borderWidth;

              if (config.webcam.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(pos.x + webcamWidth / 2, pos.y + webcamHeight / 2, webcamWidth / 2, 0, Math.PI * 2);
                ctx.stroke();
              } else {
                ctx.strokeRect(pos.x, pos.y, webcamWidth, webcamHeight);
              }
            }

            // Draw webcam with clipping
            ctx.save();
            if (config.webcam?.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(pos.x + webcamWidth / 2, pos.y + webcamHeight / 2, webcamWidth / 2, 0, Math.PI * 2);
              ctx.clip();
            } else if (config.webcam?.shape === 'rounded') {
              const radius = 10;
              ctx.beginPath();
              ctx.moveTo(pos.x + radius, pos.y);
              ctx.lineTo(pos.x + webcamWidth - radius, pos.y);
              ctx.quadraticCurveTo(pos.x + webcamWidth, pos.y, pos.x + webcamWidth, pos.y + radius);
              ctx.lineTo(pos.x + webcamWidth, pos.y + webcamHeight - radius);
              ctx.quadraticCurveTo(pos.x + webcamWidth, pos.y + webcamHeight, pos.x + webcamWidth - radius, pos.y + webcamHeight);
              ctx.lineTo(pos.x + radius, pos.y + webcamHeight);
              ctx.quadraticCurveTo(pos.x, pos.y + webcamHeight, pos.x, pos.y + webcamHeight - radius);
              ctx.lineTo(pos.x, pos.y + radius);
              ctx.quadraticCurveTo(pos.x, pos.y, pos.x + radius, pos.y);
              ctx.closePath();
              ctx.clip();
            }
            ctx.drawImage(webcamVideo, pos.x, pos.y, webcamWidth, webcamHeight);
            ctx.restore();
          }

          animationFrameRef.current = requestAnimationFrame(drawFrame);
        };

        // Wait for videos to have actual data ready
        await Promise.all([
          new Promise(resolve => {
            if (screenVideo.readyState >= 2) resolve(true);
            else screenVideo.onloadeddata = () => resolve(true);
          }),
          new Promise(resolve => {
            if (webcamVideo.readyState >= 2) resolve(true);
            else webcamVideo.onloadeddata = () => resolve(true);
          }),
        ]);

        // Ensure videos are playing
        await screenVideo.play();
        await webcamVideo.play();

        console.log('Videos ready. Screen:', screenVideo.videoWidth, 'x', screenVideo.videoHeight);
        console.log('Webcam ready:', webcamVideo.videoWidth, 'x', webcamVideo.videoHeight);

        // Start drawing BEFORE capturing stream
        drawFrame();

        // Wait for canvas to have drawn frames
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('Canvas ready, capturing stream...');

        // Get composed stream from canvas
        const composedVideoStream = canvas.captureStream(config.frameRate);
        
        // Create final stream with video from canvas and audio from mic
        finalStream = new MediaStream([
          ...composedVideoStream.getVideoTracks(),
          ...micStream.getAudioTracks(),
        ]);

      } else if (config?.mode === 'webcam') {
        // Webcam only mode
        finalStream = await navigator.mediaDevices.getUserMedia({
          video: config.cameraDeviceId 
            ? { deviceId: { exact: config.cameraDeviceId } }
            : true,
          audio: config.microphoneDeviceId
            ? { deviceId: { exact: config.microphoneDeviceId } }
            : true,
        });
      } else {
        // Screen only mode (default)
        // Get microphone separately
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: config?.microphoneDeviceId
            ? { deviceId: { exact: config.microphoneDeviceId } }
            : true,
        });
        micStreamRef.current = micStream;

        finalStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...micStream.getAudioTracks(),
        ]);
      }

      streamRef.current = finalStream;

      // Initialize RecordRTC with configured bitrate
      const bitrate = config ? calculateVideoBitrate(config.resolution.label) : 2500000;
      blobChunksRef.current = []; // Reset chunks
      recorderRef.current = new RecordRTC(finalStream, {
        type: 'video',
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: bitrate,
        audioBitsPerSecond: config?.audioBitrate || 128000,
        disableLogs: false,
        timeSlice: 1000, // Collect 1-second chunks
        ondataavailable: (blob: Blob) => {
          blobChunksRef.current.push(blob);
        },
      });

      recorderRef.current.startRecording();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Handle user stopping share via browser UI (screen mode only)
      if (config?.mode !== 'webcam') {
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          stopRecording();
        });
      }

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!recorderRef.current || !state.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current!.getBlob();
        
        // Clean up all streams
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (webcamStreamRef.current) {
          webcamStreamRef.current.getTracks().forEach(track => track.stop());
          webcamStreamRef.current = null;
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }

        // Stop animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // Clean up video elements
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
          screenVideoRef.current = null;
        }
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = null;
          webcamVideoRef.current = null;
        }

        // Remove canvas from DOM
        if (canvasRef.current && canvasRef.current.parentNode) {
          document.body.removeChild(canvasRef.current);
          console.log('✅ Canvas preview removed from DOM');
        }
        
        // Clean up canvas
        canvasRef.current = null;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        recorderRef.current = null;
        configRef.current = null;
        setState({ isRecording: false, isPaused: false, duration: 0, error: null });

        resolve(blob);
      });
    });
  }, [state.isRecording]);

  const pauseRecording = useCallback(async (): Promise<Blob | null> => {
    if (recorderRef.current && state.isRecording && !state.isPaused) {
      recorderRef.current.pauseRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setState(prev => ({ ...prev, isPaused: true }));
      
      // Combine all chunks collected so far into one blob
      const combinedBlob = new Blob(blobChunksRef.current, { type: 'video/webm' });
      return combinedBlob;
    }
    return null;
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && state.isRecording && state.isPaused) {
      recorderRef.current.resumeRecording();
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused]);

  const uploadRecording = useCallback(async (
    blob: Blob,
    sessionId: string,
    brandId: string
  ): Promise<string> => {
    const fileName = `${brandId}/${sessionId}.webm`;
    
    const { data, error } = await supabase.storage
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
  }, []);

  const updateWebcamPosition = useCallback((position: WebcamPosition) => {
    if (configRef.current && configRef.current.webcam) {
      configRef.current.webcam.position = position;
    }
  }, []);

  const updateWebcamSize = useCallback((size: number) => {
    if (configRef.current && configRef.current.webcam) {
      configRef.current.webcam.size = size;
      console.log('Webcam size updated to:', size);
    }
  }, []);

  const toggleWebcamVisibility = useCallback(() => {
    webcamVisibleRef.current = !webcamVisibleRef.current;
    console.log('Webcam visibility:', webcamVisibleRef.current);
    return webcamVisibleRef.current;
  }, []);

  const isWebcamVisible = useCallback(() => {
    return webcamVisibleRef.current;
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadRecording,
    updateWebcamPosition,
    updateWebcamSize,
    toggleWebcamVisibility,
    isWebcamVisible,
  };
};

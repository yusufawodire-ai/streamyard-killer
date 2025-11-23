import { useState, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';
import { supabase } from '@/integrations/supabase/client';
import { RecordingConfig } from '@/types/recording';

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

  const startRecording = useCallback(async (config?: RecordingConfig) => {
    try {
      // Store config for Phase 2
      configRef.current = config || null;

      // Request screen + audio with config settings
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: config?.resolution.width || 1920 },
          height: { ideal: config?.resolution.height || 1080 },
          frameRate: { ideal: config?.frameRate || 30 }
        },
        audio: true,
      });

      streamRef.current = screenStream;

      // Initialize RecordRTC
      recorderRef.current = new RecordRTC(screenStream, {
        type: 'video',
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
        disableLogs: false,
      });

      recorderRef.current.startRecording();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Handle user stopping share via browser UI
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopRecording();
      });

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
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        recorderRef.current = null;
        setState({ isRecording: false, isPaused: false, duration: 0, error: null });

        resolve(blob);
      });
    });
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && state.isRecording && !state.isPaused) {
      recorderRef.current.pauseRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setState(prev => ({ ...prev, isPaused: true }));
    }
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

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadRecording,
  };
};

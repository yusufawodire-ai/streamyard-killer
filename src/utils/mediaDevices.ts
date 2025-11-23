import { MediaDevice } from '@/types/recording';

// Get all available cameras and microphones
export const getAvailableDevices = async (): Promise<{
  cameras: MediaDevice[];
  microphones: MediaDevice[];
}> => {
  try {
    // Request permissions first
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const cameras = devices
      .filter(d => d.kind === 'videoinput')
      .map((d, index) => ({
        id: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
        kind: 'videoinput' as const,
      }));
    
    const microphones = devices
      .filter(d => d.kind === 'audioinput')
      .map((d, index) => ({
        id: d.deviceId,
        label: d.label || `Microphone ${index + 1}`,
        kind: 'audioinput' as const,
      }));
    
    return { cameras, microphones };
  } catch (error) {
    console.error('Error getting devices:', error);
    return { cameras: [], microphones: [] };
  }
};

// Test if a specific device is accessible
export const testDeviceAccess = async (
  deviceId: string,
  kind: 'video' | 'audio'
): Promise<boolean> => {
  try {
    const constraints = kind === 'video' 
      ? { video: { deviceId: { exact: deviceId } } }
      : { audio: { deviceId: { exact: deviceId } } };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error(`Device ${deviceId} not accessible:`, error);
    return false;
  }
};

// Get audio level for microphone testing (0-100)
export const getAudioLevel = (stream: MediaStream): number => {
  try {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return Math.round((average / 255) * 100);
  } catch (error) {
    console.error('Error getting audio level:', error);
    return 0;
  }
};

// Resolution presets
export const RESOLUTION_PRESETS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 },
};

// Calculate video bitrate based on resolution
export const calculateVideoBitrate = (resolution: string): number => {
  const bitrates = {
    '720p': 2000000,    // 2 Mbps (optimized)
    '1080p': 3500000,   // 3.5 Mbps (optimized)
    '1440p': 8000000,   // 8 Mbps (optimized)
    '4k': 15000000,     // 15 Mbps (optimized)
  };
  return bitrates[resolution as keyof typeof bitrates] || 3500000;
};

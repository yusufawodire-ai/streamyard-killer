// Enumerate and format devices
export const getAvailableDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  
  return {
    cameras: devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ id: d.deviceId, label: d.label || 'Camera' })),
    microphones: devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ id: d.deviceId, label: d.label || 'Microphone' })),
  };
};

// Test device access and permissions
export const testDeviceAccess = async (deviceId: string, kind: 'video' | 'audio') => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      [kind]: { deviceId }
    });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (error) {
    return false;
  }
};

// Get audio level (for microphone testing)
export const getAudioLevel = (stream: MediaStream): number => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  microphone.connect(analyser);
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  
  // Calculate average volume
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  return average / 255; // Normalize to 0-1
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

export type RecordingMode = 'screen' | 'screen-webcam' | 'webcam';
export type WebcamPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type WebcamShape = 'circle' | 'square' | 'rounded';
export type Resolution = '720p' | '1080p' | '1440p' | '4k';
export type FrameRate = 24 | 30 | 60;

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  preset?: 'full' | '1080p' | '720p' | 'square' | 'vertical' | 'custom';
}

export interface RecordingConfig {
  mode: RecordingMode;
  
  // Device selection
  cameraDeviceId?: string;
  microphoneDeviceId?: string;
  
  // Quality settings
  resolution: {
    label: Resolution;
    width: number;
    height: number;
  };
  frameRate: FrameRate;
  audioBitrate: number; // in kbps
  
  // Webcam overlay settings (only for 'screen-webcam' mode)
  webcam?: {
    position: WebcamPosition;
    size: number; // percentage (15, 20, 25)
    shape: WebcamShape;
    borderWidth: number; // 0, 2, 4
    borderColor: string;
  };
  
  // Screen area cropping settings
  crop?: CropSettings;
}

export interface MediaDevice {
  id: string;
  label: string;
  kind: 'videoinput' | 'audioinput';
}

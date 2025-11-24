import { useEffect, useRef, useState } from 'react';

export interface RecordingSyncState {
  sessionId: string;
  title: string;
  brandId: string;
  duration: number;
  isRecording: boolean;
  isPaused: boolean;
  isUploading: boolean;
  uploadProgress: number;
  mode: string;
  isWebcamVisible: boolean;
  webcamPosition?: string;
  webcamSize?: number;
}

export interface RecordingSyncCommand {
  type: 'pause' | 'resume' | 'stop' | 'toggle-webcam' | 'update-webcam-position' | 'update-webcam-size';
  payload?: any;
}

const CHANNEL_NAME = 'recording-sync';

export const useRecordingSync = (isHost = false) => {
  const [state, setState] = useState<RecordingSyncState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const commandCallbackRef = useRef<((command: RecordingSyncCommand) => void) | null>(null);

  useEffect(() => {
    // Create BroadcastChannel
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    // Listen for messages
    channelRef.current.onmessage = (event) => {
      if (event.data.type === 'state-update') {
        setState(event.data.state);
      } else if (event.data.type === 'command') {
        // If we're the host, execute commands from popup
        if (isHost && commandCallbackRef.current) {
          commandCallbackRef.current(event.data.command);
        }
      } else if (event.data.type === 'request-state') {
        // Popup requesting current state, host should respond
        if (isHost && state) {
          broadcastState(state);
        }
      }
    };

    // If we're the popup, request initial state from host
    if (!isHost) {
      channelRef.current.postMessage({ type: 'request-state' });
    }

    return () => {
      channelRef.current?.close();
    };
  }, [isHost]);

  const broadcastState = (newState: RecordingSyncState) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'state-update',
        state: newState,
      });
      setState(newState);
    }
  };

  const sendCommand = (command: RecordingSyncCommand) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'command',
        command,
      });
    }
  };

  const setCommandCallback = (callback: (command: RecordingSyncCommand) => void) => {
    commandCallbackRef.current = callback;
  };

  return {
    state,
    broadcastState,
    sendCommand,
    setCommandCallback,
  };
};

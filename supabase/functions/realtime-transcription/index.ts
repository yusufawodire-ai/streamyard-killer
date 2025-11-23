import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket: browserSocket, response } = Deno.upgradeWebSocket(req);
  
  const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!ASSEMBLYAI_API_KEY) {
    console.error('ASSEMBLYAI_API_KEY not configured');
    browserSocket.close(1008, 'API key not configured');
    return response;
  }

  let assemblySocket: WebSocket | null = null;

  browserSocket.onopen = () => {
    console.log('Browser WebSocket connected');
    
    // Connect to AssemblyAI's real-time API with token as query parameter
    assemblySocket = new WebSocket(
      `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${ASSEMBLYAI_API_KEY}`
    );

    assemblySocket.onopen = () => {
      console.log('Connected to AssemblyAI');
      browserSocket.send(JSON.stringify({ type: 'connected' }));
    };

    assemblySocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('AssemblyAI message:', data);
        
        // Handle all message types
        if (data.message_type === 'SessionBegins') {
          console.log('AssemblyAI session ready');
          // Check browser socket state before sending
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.send(JSON.stringify({ type: 'ready' }));
          }
        } 
        else if (data.message_type === 'SessionInformation') {
          console.log('AssemblyAI session info:', data);
        }
        else if (data.message_type === 'PartialTranscript' && data.text) {
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.send(JSON.stringify({
              type: 'transcript',
              text: data.text,
              is_final: false
            }));
          }
        } 
        else if (data.message_type === 'FinalTranscript' && data.text) {
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.send(JSON.stringify({
              type: 'transcript',
              text: data.text,
              is_final: true
            }));
          }
        }
        else if (data.error) {
          console.error('AssemblyAI error:', data.error);
          if (browserSocket.readyState === WebSocket.OPEN) {
            browserSocket.send(JSON.stringify({ 
              type: 'error', 
              message: data.error 
            }));
          }
        }
        else {
          // Log unknown message types for debugging
          console.log('Unknown AssemblyAI message type:', data.message_type);
        }
      } catch (error) {
        console.error('Error parsing AssemblyAI message:', error);
      }
    };

    assemblySocket.onerror = (error) => {
      console.error('AssemblyAI WebSocket error:', error);
      browserSocket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Transcription service error' 
      }));
    };

    assemblySocket.onclose = () => {
      console.log('AssemblyAI connection closed');
      browserSocket.close();
    };
  };

  browserSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'audio' && assemblySocket && assemblySocket.readyState === WebSocket.OPEN) {
        // Forward audio data to AssemblyAI
        assemblySocket.send(JSON.stringify({ audio_data: data.data }));
      } else if (data.type === 'terminate') {
        // Send terminate message to AssemblyAI
        if (assemblySocket && assemblySocket.readyState === WebSocket.OPEN) {
          assemblySocket.send(JSON.stringify({ terminate_session: true }));
        }
      }
    } catch (error) {
      console.error('Error processing browser message:', error);
    }
  };

  browserSocket.onclose = () => {
    console.log('Browser WebSocket closed');
    if (assemblySocket) {
      assemblySocket.close();
    }
  };

  browserSocket.onerror = (error) => {
    console.error('Browser WebSocket error:', error);
    if (assemblySocket) {
      assemblySocket.close();
    }
  };

  return response;
});

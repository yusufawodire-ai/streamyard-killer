import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    // Validate required fields
    if (!session_id) {
      console.error('Missing session_id');
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Whisper] Starting transcription for session:', session_id);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the session
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Whisper] Error fetching session:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.error('[Whisper] Session not found:', session_id);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session.final_video_url) {
      console.error('[Whisper] No video URL available for session:', session_id);
      return new Response(
        JSON.stringify({ error: 'Recording not ready yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Whisper] Downloading video:', session.final_video_url);

    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('[Whisper] OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update session status to transcribing
    await supabase
      .from('sessions')
      .update({ 
        status: 'transcribing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    // Download the video file
    const videoResponse = await fetch(session.final_video_url);
    if (!videoResponse.ok) {
      console.error('[Whisper] Failed to download video:', videoResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to download video' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoBlob = await videoResponse.blob();
    console.log('[Whisper] Video downloaded, size:', videoBlob.size, 'bytes');

    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', videoBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'verbose_json');

    console.log('[Whisper] Sending to OpenAI Whisper API...');

    // Send to OpenAI Whisper (synchronous API call)
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[Whisper] API error:', whisperResponse.status, errorText);
      
      // Create transcript record with error
      await supabase
        .from('transcripts')
        .insert({
          session_id: session.id,
          status: 'error',
          provider: 'openai-whisper',
          error_message: `Whisper API error: ${errorText}`,
          language: 'en',
        });

      // Update session status
      await supabase
        .from('sessions')
        .update({ 
          status: 'error',
          error_message: 'Transcription failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whisperData = await whisperResponse.json();
    console.log('[Whisper] Transcription completed, text length:', whisperData.text?.length || 0);

    // Save transcript to database with status 'completed'
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        session_id: session.id,
        status: 'completed',
        provider: 'openai-whisper',
        language: 'en',
        full_text: whisperData.text,
        word_count: whisperData.text ? whisperData.text.split(/\s+/).length : 0,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('[Whisper] Error creating transcript record:', transcriptError);
      return new Response(
        JSON.stringify({ error: 'Failed to save transcript', details: transcriptError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update session status to completed
    await supabase
      .from('sessions')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    console.log('[Whisper] Transcription saved successfully:', transcript.id);

    return new Response(
      JSON.stringify({
        transcript_id: transcript.id,
        status: 'completed',
        text: whisperData.text,
        word_count: transcript.word_count,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Whisper] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

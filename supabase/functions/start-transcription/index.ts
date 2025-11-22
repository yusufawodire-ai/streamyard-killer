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

    console.log('Starting transcription for session:', session_id);

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
      console.error('Error fetching session:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.error('Session not found:', session_id);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session.daily_download_url) {
      console.error('No download URL available for session:', session_id);
      return new Response(
        JSON.stringify({ error: 'Recording not ready yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Submitting to AssemblyAI:', session.daily_download_url);

    // Get AssemblyAI API key
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      console.error('ASSEMBLYAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AssemblyAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit to AssemblyAI
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: session.daily_download_url,
        language_code: 'en',
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('AssemblyAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to start transcription', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcriptData = await transcriptResponse.json();
    console.log('AssemblyAI job created:', transcriptData.id);

    // Create transcript record
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        session_id: session.id,
        status: 'processing',
        provider: 'assemblyai',
        provider_job_id: transcriptData.id,
        language: 'en',
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Error creating transcript record:', transcriptError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transcript record', details: transcriptError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ 
        status: 'transcribing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Error updating session:', updateError);
    }

    console.log('Transcription started successfully:', transcript.id);

    return new Response(
      JSON.stringify({
        transcript_id: transcript.id,
        assemblyai_job_id: transcriptData.id,
        status: 'processing',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in start-transcription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

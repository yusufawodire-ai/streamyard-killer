import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript_id } = await req.json();

    if (!transcript_id) {
      throw new Error('transcript_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch transcript record
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcript_id)
      .single();

    if (fetchError) throw fetchError;
    if (!transcript) throw new Error('Transcript not found');

    // If already completed, return status
    if (transcript.status === 'completed') {
      return new Response(
        JSON.stringify({ status: 'completed', transcript }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check AssemblyAI job status
    const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!ASSEMBLYAI_API_KEY) {
      throw new Error('ASSEMBLYAI_API_KEY not configured');
    }

    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcript.provider_job_id}`,
      {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`AssemblyAI API error: ${response.status}`);
    }

    const jobData = await response.json();
    console.log('AssemblyAI job status:', jobData.status);

    // Update transcript based on status
    if (jobData.status === 'completed') {
      const updateData = {
        status: 'completed',
        full_text: jobData.text,
        word_count: jobData.words?.length || null,
        completed_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('transcripts')
        .update(updateData)
        .eq('id', transcript_id);

      if (updateError) throw updateError;

      // Update session with transcript URL (if AssemblyAI provides one)
      if (jobData.text) {
        await supabase
          .from('sessions')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transcript.session_id);
      }

      return new Response(
        JSON.stringify({ 
          status: 'completed', 
          transcript: { ...transcript, ...updateData }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (jobData.status === 'error') {
      const errorData = {
        status: 'failed',
        error_message: jobData.error || 'Transcription failed',
      };

      await supabase
        .from('transcripts')
        .update(errorData)
        .eq('id', transcript_id);

      return new Response(
        JSON.stringify({ status: 'error', error: errorData.error_message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    } else {
      // Still processing
      return new Response(
        JSON.stringify({ status: jobData.status, transcript }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in check-transcription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

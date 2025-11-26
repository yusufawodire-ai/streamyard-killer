import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { transcript, context } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating AI suggestions for transcript length:', transcript.length);
    console.log('Context:', context);

    const systemPrompt = `You are an AI content coach helping a video creator record better content. 
Based on the transcript of what they've recorded so far, analyze the content and suggest 3-5 actionable next steps.

Your suggestions should:
- Identify key topics they haven't fully covered yet
- Suggest questions viewers might have that need answering
- Point out concepts that need clarification or expansion
- Provide natural transitions to continue the narrative
- Be concise and actionable (1-2 sentences each)
- Be prioritized by importance (high, medium, low)

${context?.brand ? `Brand context: ${context.brand}` : ''}
${context?.title ? `Video title: ${context.title}` : ''}
${context?.topics ? `Key topics to cover: ${context.topics.join(', ')}` : ''}

Format your response as a JSON array with this structure:
[
  {
    "text": "Suggestion text here",
    "priority": "high" | "medium" | "low",
    "reason": "Brief reason why this is important"
  }
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective for this use case
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here's the transcript so far:\n\n${transcript}\n\nProvide 3-5 actionable suggestions for what to cover next.` }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const suggestionsText = data.choices[0].message.content;
    
    let suggestions;
    try {
      const parsed = JSON.parse(suggestionsText);
      // Handle both array format and object with suggestions array
      suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
      
      // Add IDs to suggestions
      suggestions = suggestions.map((s: any, i: number) => ({
        id: i + 1,
        ...s
      }));
    } catch (e) {
      console.error('Failed to parse suggestions JSON:', e);
      suggestions = [];
    }

    console.log('Generated suggestions:', suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-suggestions function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [] 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

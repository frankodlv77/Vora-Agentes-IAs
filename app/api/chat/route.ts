/**
 * /api/chat — Endpoint principal del chat de demo
 *
 * Recibe: { message, history, init }
 *   - init: true → genera saludo inicial (no muestra mensaje del user)
 *   - message + history → respuesta normal al usuario
 *
 * Flujo:
 *   1. Lee config activa de Supabase (demo_config id=1)
 *   2. Llama a buildSystemPrompt(config) → prompt largo y específico
 *   3. Llama a Claude (claude-sonnet-4-6) con ese system prompt
 *   4. Devuelve { response: string }
 *
 * La ANTHROPIC_API_KEY nunca se expone al cliente (server-side only).
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { DEFAULT_CONFIG } from '@/lib/types';
import { buildSystemPrompt } from '@/lib/promptBuilder';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, history, init } = await req.json();

    // Fetch current config
    const { data: configData } = await getSupabase()
      .from('demo_config')
      .select('*')
      .eq('id', 1)
      .single();

    const config = configData || DEFAULT_CONFIG;
    const systemPrompt = buildSystemPrompt(config);

    let messages: Anthropic.MessageParam[];

    if (init) {
      messages = [
        {
          role: 'user',
          content:
            'Iniciá la conversación con un saludo natural y breve. Preguntá en qué podés ayudar. Una sola frase corta, no más.',
        },
      ];
    } else {
      const historyMessages: Anthropic.MessageParam[] = (history || []).map(
        (msg: { role: string; content: string }) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })
      );

      messages = [
        ...historyMessages,
        { role: 'user', content: message },
      ];
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: init ? 100 : 500,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    return NextResponse.json({ response: content.text });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 500 });
  }
}

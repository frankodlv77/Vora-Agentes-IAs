/**
 * /api/config — CRUD de la configuración activa del agente
 *
 * GET  → Lee demo_config id=1 de Supabase. Si no existe, devuelve DEFAULT_CONFIG.
 * POST → Hace upsert en demo_config id=1 con los datos del body.
 *        Llamado desde /admin al presionar "Guardar configuración".
 *
 * La tabla demo_config siempre tiene UNA sola fila (id=1).
 * Cada save sobreescribe esa fila — no hay historial de configs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CONFIG } from '@/lib/types';

export async function GET() {
  const { data, error } = await supabase
    .from('demo_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return NextResponse.json(DEFAULT_CONFIG);
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { error } = await supabase
    .from('demo_config')
    .upsert(
      { ...body, id: 1, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Supabase upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

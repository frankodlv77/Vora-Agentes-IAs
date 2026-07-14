export interface DemoConfig {
  id: number;
  business_name: string;
  industry: string;
  industry_custom: string | null;
  services: string;
  schedule: string;
  tone: 'formal' | 'informal';
  target_age: 'adulto' | 'joven';
  emoji_level: 'ninguno' | 'moderado' | 'alto';
  response_length: 'corta' | 'media' | 'detallada';
  main_focus: 'atencion' | 'atencion_venta' | 'venta_activa';
  schedules_appointments: boolean;
  cold_follow_up: boolean;
  human_handoff: boolean;
  proactivity: 'reactivo' | 'proactivo';
  personality_trait: 'cercano' | 'profesional' | 'entusiasta' | 'tranquilo';
  updated_at: string;
}

export const DEFAULT_CONFIG: DemoConfig = {
  id: 1,
  business_name: 'Mi Negocio',
  industry: 'otro',
  industry_custom: null,
  services: '',
  schedule: '',
  tone: 'informal',
  target_age: 'adulto',
  emoji_level: 'moderado',
  response_length: 'corta',
  main_focus: 'atencion',
  schedules_appointments: false,
  cold_follow_up: false,
  human_handoff: false,
  proactivity: 'reactivo',
  personality_trait: 'cercano',
  updated_at: new Date().toISOString(),
};

export const INDUSTRY_NAMES: Record<string, string> = {
  dental: 'clínica dental',
  estetica: 'clínica estética',
  gimnasio: 'gimnasio',
  psicologo: 'consultorio de psicología',
  restaurante: 'restaurante',
  ropa: 'tienda de ropa',
  peluqueria: 'peluquería',
  veterinaria: 'veterinaria',
  otro: 'negocio',
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

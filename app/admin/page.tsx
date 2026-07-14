'use client';
/**
 * /admin — Panel de configuración privado de ARIA
 *
 * Protegido con password simple:
 *   1. POST /api/admin/auth { password } → compara con ADMIN_PASSWORD env var
 *   2. Si ok → sessionStorage.setItem('vora_admin', 'true')
 *   3. Panel visible → carga config actual desde /api/config (GET)
 *   4. Al guardar → POST /api/config con upsert en demo_config id=1
 *
 * Secciones del formulario:
 *   1. Identidad del negocio (nombre, rubro, servicios, horario)
 *   2. Personalidad (tono, target edad, emojis, largo respuesta)
 *   3. Objetivo funcional (atención / venta suave / venta activa + toggles)
 *   4. Extras (proactividad, rasgo de personalidad)
 *
 * Cambiar cualquier campo y guardar → la demo lo refleja en el próximo mensaje.
 * Componentes internos: Section, Field, ToggleRow, SegmentControl (todos inline).
 */
import { useState, useEffect, FormEvent } from 'react';
import { DemoConfig, DEFAULT_CONFIG } from '@/lib/types';

const INDUSTRIES = [
  { value: 'dental', label: 'Clínica dental' },
  { value: 'estetica', label: 'Clínica estética' },
  { value: 'gimnasio', label: 'Gimnasio' },
  { value: 'psicologo', label: 'Psicólogo' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'ropa', label: 'Tienda de ropa' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'veterinaria', label: 'Veterinaria' },
  { value: 'otro', label: 'Otro...' },
];

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-slider" />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E2DC',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#6B6B6B',
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#2A2A2A' }}>{label}</label>
      {hint && <span style={{ fontSize: 12, color: '#6B6B6B', marginTop: -4 }}>{hint}</span>}
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  id,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#2A2A2A' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>{hint}</div>}
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: '1px solid #E5E2DC',
  borderRadius: 8,
  background: '#FAFAF8',
  color: '#1A1A1A',
  fontFamily: 'inherit',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
};

const SEGMENTS = [
  { value: 'formal', label: 'Formal' },
  { value: 'informal', label: 'Informal' },
];

function SegmentControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: '#F0EDE7',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '7px 18px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? '#1A1A1A' : 'transparent',
            color: value === opt.value ? '#fff' : '#6B6B6B',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [config, setConfig] = useState<DemoConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('vora_admin');
      if (auth === 'true') {
        setIsAuth(true);
        loadConfig();
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch {
      setConfig(DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.authenticated) {
        sessionStorage.setItem('vora_admin', 'true');
        setIsAuth(true);
        loadConfig();
      } else {
        setAuthError('Contraseña incorrecta.');
      }
    } catch {
      setAuthError('Error de conexión.');
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError('');
    setSavedAt(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (data.success) {
        setSavedAt(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        setSaveError('Error al guardar. Revisá la consola.');
      }
    } catch {
      setSaveError('Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  }

  function set<K extends keyof DemoConfig>(key: K, value: DemoConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  }

  // ── AUTH SCREEN ──────────────────────────────────────────────────────────
  if (!isAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F0EDE7',
          padding: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E2DC',
            borderRadius: 16,
            padding: '40px 36px',
            width: '100%',
            maxWidth: 360,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1A1A1A' }}>
              VORA
            </div>
            <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>Panel de configuración</div>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, textAlign: 'center' }}
              autoFocus
            />
            {authError && (
              <p style={{ fontSize: 13, color: '#c0392b', textAlign: 'center', margin: 0 }}>
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={isAuthLoading || !password}
              style={{
                padding: '11px 0',
                background: password ? '#1A1A1A' : '#E5E2DC',
                color: password ? '#fff' : '#999',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: password ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {isAuthLoading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F0EDE7',
        }}
      >
        <div style={{ fontSize: 14, color: '#6B6B6B' }}>Cargando configuración...</div>
      </div>
    );
  }

  // ── ADMIN PANEL ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F0EDE7' }}>
      {/* Header */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #E5E2DC',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#1A1A1A' }}>
            VORA
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#6B6B6B',
              background: '#F0EDE7',
              borderRadius: 20,
              padding: '3px 10px',
            }}
          >
            Admin
          </span>
        </div>

        <a
          href="/demo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#1A1A1A',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            border: '1px solid #E5E2DC',
            borderRadius: 8,
          }}
        >
          Ver demo →
        </a>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 48px' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#1A1A1A',
            marginBottom: 6,
            marginTop: 0,
          }}
        >
          Configuración de ARIA
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24, marginTop: 0 }}>
          Los cambios se reflejan en el chat de demo de forma inmediata.
        </p>

        {/* Section 1: Identidad */}
        <Section title="Identidad del negocio">
          <Field label="Nombre del negocio">
            <input
              type="text"
              placeholder="Ej: Clínica Sonrisa, Gym Fuerza Total..."
              value={config.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Rubro">
            <select
              value={config.industry}
              onChange={(e) => set('industry', e.target.value)}
              style={selectStyle}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>

          {config.industry === 'otro' && (
            <Field label="¿Cuál es el rubro?">
              <input
                type="text"
                placeholder="Ej: estudio contable, inmobiliaria, clínica veterinaria..."
                value={config.industry_custom || ''}
                onChange={(e) => set('industry_custom', e.target.value)}
                style={inputStyle}
              />
            </Field>
          )}

          <Field
            label="Servicios y precios"
            hint="El agente usará esta info para responder consultas. Sé específico."
          >
            <textarea
              placeholder="Ej: Limpieza dental $15.000, Blanqueamiento $35.000, Ortodoncia — consulta sin cargo inicial"
              value={config.services}
              onChange={(e) => set('services', e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </Field>

          <Field label="Horario de atención">
            <input
              type="text"
              placeholder="Ej: Lunes a viernes 9 a 19hs, sábados 9 a 13hs"
              value={config.schedule}
              onChange={(e) => set('schedule', e.target.value)}
              style={inputStyle}
            />
          </Field>
        </Section>

        {/* Section 2: Personalidad */}
        <Section title="Personalidad del agente">
          <Field label="Tono" hint="Formal = usted, oraciones completas, sin emojis. Informal = vos, coloquial argentino.">
            <SegmentControl
              value={config.tone}
              onChange={(v) => set('tone', v as DemoConfig['tone'])}
              options={[
                { value: 'formal', label: 'Formal' },
                { value: 'informal', label: 'Informal' },
              ]}
            />
          </Field>

          <Field label="Target de edad">
            <SegmentControl
              value={config.target_age}
              onChange={(v) => set('target_age', v as DemoConfig['target_age'])}
              options={[
                { value: 'adulto', label: 'Adulto' },
                { value: 'joven', label: 'Joven' },
              ]}
            />
          </Field>

          <Field label="Nivel de emojis">
            <select
              value={config.emoji_level}
              onChange={(e) => set('emoji_level', e.target.value as DemoConfig['emoji_level'])}
              style={selectStyle}
            >
              <option value="ninguno">Ninguno</option>
              <option value="moderado">Moderado (1–2 por mensaje)</option>
              <option value="alto">Alto (libre)</option>
            </select>
          </Field>

          <Field label="Largo de respuesta">
            <select
              value={config.response_length}
              onChange={(e) => set('response_length', e.target.value as DemoConfig['response_length'])}
              style={selectStyle}
            >
              <option value="corta">Corta — estilo WhatsApp real (1–2 líneas)</option>
              <option value="media">Media — con algo de contexto (3–5 líneas)</option>
              <option value="detallada">Detallada — información completa</option>
            </select>
          </Field>
        </Section>

        {/* Section 3: Objetivo funcional */}
        <Section title="Objetivo funcional">
          <Field
            label="Enfoque principal"
            hint="Esto cambia el comportamiento del agente dramáticamente."
          >
            <select
              value={config.main_focus}
              onChange={(e) => set('main_focus', e.target.value as DemoConfig['main_focus'])}
              style={selectStyle}
            >
              <option value="atencion">Solo atención — responde dudas, no empuja venta</option>
              <option value="atencion_venta">Atención + venta suave — responde y sugiere el siguiente paso</option>
              <option value="venta_activa">Venta activa — califica, avanza, busca el cierre</option>
            </select>
          </Field>

          <ToggleRow
            id="toggle-agenda"
            label="¿Agenda turnos?"
            hint="El agente ofrece activamente horarios y pide confirmación"
            checked={config.schedules_appointments}
            onChange={(v) => set('schedules_appointments', v)}
          />

          <ToggleRow
            id="toggle-followup"
            label="¿Hace seguimiento a leads fríos?"
            hint="Menciona que vuelve a escribir si no hay respuesta"
            checked={config.cold_follow_up}
            onChange={(v) => set('cold_follow_up', v)}
          />

          <ToggleRow
            id="toggle-handoff"
            label="¿Deriva a humano?"
            hint="Dice 'te paso con el encargado' ante preguntas complejas o quejas"
            checked={config.human_handoff}
            onChange={(v) => set('human_handoff', v)}
          />
        </Section>

        {/* Section 4: Extras */}
        <Section title="Extras de personalidad">
          <Field label="Nivel de proactividad">
            <SegmentControl
              value={config.proactivity}
              onChange={(v) => set('proactivity', v as DemoConfig['proactivity'])}
              options={[
                { value: 'reactivo', label: 'Reactivo' },
                { value: 'proactivo', label: 'Proactivo' },
              ]}
            />
          </Field>

          <Field label="Rasgo de personalidad">
            <select
              value={config.personality_trait}
              onChange={(e) => set('personality_trait', e.target.value as DemoConfig['personality_trait'])}
              style={selectStyle}
            >
              <option value="cercano">Cercano y cálido</option>
              <option value="profesional">Profesional y directo</option>
              <option value="entusiasta">Entusiasta y vendedor</option>
              <option value="tranquilo">Tranquilo y paciente</option>
            </select>
          </Field>
        </Section>

        {/* Save button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '14px 0',
              background: isSaving ? '#999' : '#1A1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </button>

          {savedAt && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#166534' }}>
                  ✓ Configuración guardada a las {savedAt}
                </span>
                <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
                  La demo se actualiza inmediatamente con estos cambios.
                </div>
              </div>
              <a
                href="/demo"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#166534',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Abrir demo →
              </a>
            </div>
          )}

          {saveError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 14,
                color: '#b91c1c',
              }}
            >
              {saveError}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

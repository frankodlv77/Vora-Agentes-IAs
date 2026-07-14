'use client';
/**
 * /demo — Chat público estilo WhatsApp dentro de un frame iPhone 17 Pro Max
 *
 * Layout:
 *   - VORA header (fuera del teléfono): ARIA logo + "⚙ Config"
 *   - iPhone frame: titanium negro, Dynamic Island, side buttons, home indicator
 *   - Dentro: status bar real + WA header verde + mensajes + input
 *   - Debajo del teléfono: "↺ Nueva conversación" (para Franco, fuera del frame)
 *
 * Auto-reset: escucha localStorage 'vora-config-version' (que admin actualiza al guardar)
 * Reset manual: botón debajo del frame
 * Greeting: se genera con Claude al cargar y al resetear
 */
import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { ChatMessage, DemoConfig, DEFAULT_CONFIG } from '@/lib/types';

const WA_GREEN = '#128C7E';
const WA_DARK_GREEN = '#075E54';
const WA_BG = '#E5DDD5';
const USER_BUBBLE = '#D9FDD3';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function CheckMark({ read }: { read: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" style={{ display: 'inline-block', marginLeft: 2 }}>
      <path d="M11.07.56L4.26 7.37 1.5 4.6 0 6.1l4.26 4.26 8.31-8.3z" fill={read ? '#53bdeb' : '#8696a0'} />
      <path d="M15.07.56L8.26 7.37 7 6.1l-1.5 1.5 2.76 2.76 8.31-8.3z" fill={read ? '#53bdeb' : '#8696a0'} />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 12 }}>
      <div className="bubble-agent" style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
        <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8696a0' }} />
        <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8696a0' }} />
        <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8696a0' }} />
      </div>
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div style={{ height: 52, background: WA_GREEN, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 22px 8px', flexShrink: 0, position: 'relative' }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {/* Signal bars */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="white">
          <rect x="0" y="7" width="3" height="5" rx="1" />
          <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" />
          <rect x="9" y="2" width="3" height="10" rx="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3" />
        </svg>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 24 18" fill="white">
          <circle cx="12" cy="16" r="2.5" />
          <path d="M6.5 11.5C7.9 10 9.85 9 12 9s4.1 1 5.5 2.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M2 7.5C4.5 5 8.1 3.5 12 3.5s7.5 1.5 10 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>
        {/* Battery */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 25, height: 12, border: '1.5px solid rgba(255,255,255,0.85)', borderRadius: 3, padding: 2, display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: '72%', height: '100%', background: '#fff', borderRadius: 1 }} />
            <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 6, background: 'rgba(255,255,255,0.6)', borderRadius: '0 1.5px 1.5px 0' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [config, setConfig] = useState<DemoConfig>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const resetChat = useCallback(async () => {
    setMessages([]);
    setInputText('');
    setIsInitializing(true);
    setIsTyping(true);
    setReadMessages(new Set());

    // Re-fetch config (can have changed since last reset)
    try {
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      setConfig(configData);
    } catch { /* keep current config */ }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init: true, history: [] }),
      });
      const data = await res.json();
      setMessages([{ id: `msg-${Date.now()}`, role: 'assistant', content: data.response, timestamp: new Date() }]);
    } catch {
      setMessages([{ id: `msg-${Date.now()}`, role: 'assistant', content: '¡Hola! ¿En qué te puedo ayudar?', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
      setIsInitializing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { resetChat(); }, [resetChat]);

  // Auto-reset when admin saves config (cross-tab via localStorage)
  useEffect(() => {
    function onStorageChange(e: StorageEvent) {
      if (e.key === 'vora-config-version') resetChat();
    }
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, [resetChat]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || isTyping || isInitializing) return;

    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: inputText.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history }),
      });
      const data = await res.json();
      const agentMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'assistant', content: data.response, timestamp: new Date() };
      setReadMessages(prev => new Set([...prev, userMsg.id]));
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      setMessages(prev => [...prev, { id: `msg-${Date.now()}`, role: 'assistant', content: 'Un momento, estamos teniendo inconvenientes técnicos.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const businessInitial = config.business_name?.[0]?.toUpperCase() || 'N';

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F0EDE7', fontFamily: "'Sora', sans-serif", overflow: 'hidden' }}>

      {/* ── VORA Header (fuera del teléfono) ── */}
      <div style={{ background: '#F0EDE7', borderBottom: '1px solid #E5E2DC', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <img src="/aria2.png" alt="ARIA" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 20%', border: '1.5px solid #E5E2DC' }} />
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>Estás probando ARIA</div>
          <div style={{ fontSize: 10, color: '#6B6B6B' }}>el asistente de <span style={{ fontWeight: 600, color: '#1A1A1A' }}>Vora IA</span></div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <a href="/admin" style={{ fontSize: 11, fontWeight: 500, color: '#6B6B6B', textDecoration: 'none', padding: '5px 12px', border: '1px solid #E5E2DC', borderRadius: 20, background: '#fff' }}>
            ⚙ Config
          </a>
        </div>
      </div>

      {/* ── iPhone + controls ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 16px 14px', gap: 12, overflow: 'hidden' }}>

        {/* iPhone 17 Pro Max frame */}
        <div style={{
          position: 'relative',
          height: 'min(calc(100dvh - 145px), 760px)',
          aspectRatio: '390 / 844',
          background: 'linear-gradient(158deg, #48484A 0%, #1C1C1E 30%, #2C2C2E 60%, #1C1C1E 85%, #3A3A3C 100%)',
          borderRadius: 54,
          padding: '14px 10px 12px',
          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.09), 0 0 0 2px #0A0A0A, 0 50px 120px rgba(0,0,0,0.55), 0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Action button (izquierda arriba) */}
          <div style={{ position: 'absolute', left: -3.5, top: '14%', width: 4, height: 32, background: '#3A3A3C', borderRadius: '2px 0 0 2px', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)' }} />
          {/* Volume up */}
          <div style={{ position: 'absolute', left: -3.5, top: '24%', width: 4, height: 58, background: '#3A3A3C', borderRadius: '2px 0 0 2px', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)' }} />
          {/* Volume down */}
          <div style={{ position: 'absolute', left: -3.5, top: '35%', width: 4, height: 58, background: '#3A3A3C', borderRadius: '2px 0 0 2px', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)' }} />
          {/* Power button (derecha) */}
          <div style={{ position: 'absolute', right: -3.5, top: '26%', width: 4, height: 82, background: '#3A3A3C', borderRadius: '0 2px 2px 0', boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.08)' }} />

          {/* Phone screen */}
          <div style={{ flex: 1, borderRadius: 44, overflow: 'hidden', background: '#000', display: 'flex', flexDirection: 'column', position: 'relative' }}>

            {/* Dynamic Island */}
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 'min(120px, 32%)', height: 34, background: '#000', borderRadius: 20, zIndex: 20 }} />

            {/* Status bar + WA Header (verde, continuo) */}
            <div style={{ background: WA_GREEN, flexShrink: 0 }}>
              <StatusBar time={currentTime} />
              {/* WA business row */}
              <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: WA_DARK_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {businessInitial}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{config.business_name || 'Mi Negocio'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                    en línea
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, opacity: 0.7 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="wa-messages" style={{
              flex: 1, overflowY: 'auto', padding: '10px 10px 6px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C5B8AD' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: WA_BG,
            }}>
              {isInitializing && messages.length === 0 && <TypingIndicator />}

              {messages.map(msg => msg.role === 'assistant' ? (
                <div key={msg.id} className="message-bubble" style={{ display: 'flex', marginBottom: 6, paddingLeft: 10 }}>
                  <div className="bubble-agent" style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '7px 10px 5px', maxWidth: '80%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#111', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                    <div style={{ textAlign: 'right', marginTop: 2, fontSize: 10, color: '#8696a0' }}>{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="message-bubble" style={{ display: 'flex', marginBottom: 6, justifyContent: 'flex-end', paddingRight: 10 }}>
                  <div className="bubble-user" style={{ background: USER_BUBBLE, borderRadius: '12px 0 12px 12px', padding: '7px 10px 5px', maxWidth: '80%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#111', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: '#8696a0' }}>{formatTime(msg.timestamp)}</span>
                      <CheckMark read={readMessages.has(msg.id)} />
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && !isInitializing && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ background: '#f0f2f5', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, borderTop: '1px solid #e9edef' }}>
              <div style={{ flex: 1, background: '#fff', borderRadius: 22, display: 'flex', alignItems: 'center', padding: '0 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escribí un mensaje"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  disabled={isInitializing}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#111', background: 'transparent', padding: '10px 0', fontFamily: "'Sora', sans-serif" }}
                />
              </div>
              <button type="submit" disabled={!inputText.trim() || isTyping} style={{ width: 38, height: 38, borderRadius: '50%', background: inputText.trim() && !isTyping ? WA_GREEN : '#8696a0', border: 'none', cursor: inputText.trim() && !isTyping ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" /></svg>
              </button>
            </form>

            {/* Home indicator */}
            <div style={{ height: 26, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 120, height: 5, background: 'rgba(255,255,255,0.85)', borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* ↺ Nueva conversación — fuera del frame, para Franco */}
        <button
          onClick={resetChat}
          disabled={isInitializing}
          style={{ padding: '7px 18px', background: 'transparent', border: '1px solid #E5E2DC', borderRadius: 20, fontSize: 12, color: isInitializing ? '#C0BDB8' : '#6B6B6B', cursor: isInitializing ? 'default' : 'pointer', fontFamily: "'Sora', sans-serif", display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
        >
          ↺ Nueva conversación
        </button>
      </div>
    </div>
  );
}

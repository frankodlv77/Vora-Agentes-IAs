'use client';
/**
 * /demo — Chat público estilo WhatsApp
 *
 * Diseño: fiel a WhatsApp (header verde, burbujas con tails CSS, fondo #E5DDD5,
 * typing indicator, double checkmarks) envuelto en branding VORA (crema, ARIA image).
 *
 * Al cargar:
 *   1. Fetch /api/config → obtiene nombre del negocio para el header WA
 *   2. POST /api/chat { init: true } → Claude genera saludo inicial
 *
 * Mensajes del usuario: verdes a la derecha (bubble-user class + tail via globals.css)
 * Mensajes del agente:  blancos a la izquierda (bubble-agent class + tail via globals.css)
 * Typing indicator:     3 dots animados (typing-dot class via globals.css)
 * Checkmarks:           grises → azules cuando el agente responde (SVG inline)
 *
 * Sin login ni autenticación — es el link público que Franco manda al prospecto.
 */
import { useState, useEffect, useRef, FormEvent } from 'react';
import { ChatMessage, DemoConfig, DEFAULT_CONFIG } from '@/lib/types';

const WA_GREEN = '#128C7E';
const WA_DARK_GREEN = '#075E54';
const WA_BG = '#E5DDD5';
const USER_BUBBLE = '#D9FDD3';
const AGENT_BUBBLE = '#ffffff';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function CheckMark({ read }: { read: boolean }) {
  return (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      style={{ display: 'inline-block', marginLeft: 2 }}
    >
      <path
        d="M11.07.56L4.26 7.37 1.5 4.6 0 6.1l4.26 4.26 8.31-8.3z"
        fill={read ? '#53bdeb' : '#8696a0'}
      />
      <path
        d="M15.07.56L8.26 7.37 7 6.1l-1.5 1.5 2.76 2.76 8.31-8.3z"
        fill={read ? '#53bdeb' : '#8696a0'}
      />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 12 }}>
      <div
        className="bubble-agent"
        style={{
          background: AGENT_BUBBLE,
          borderRadius: '0 12px 12px 12px',
          padding: '12px 16px',
          display: 'flex',
          gap: 5,
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8696a0' }} />
        <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8696a0' }} />
        <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8696a0' }} />
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    async function init() {
      // Load config
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        setConfig(data);
      } catch {
        // use defaults
      }

      // Get opening greeting from ARIA
      setIsTyping(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init: true, history: [] }),
        });
        const data = await res.json();
        const greeting: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages([greeting]);
      } catch {
        const fallback: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: '¡Hola! ¿En qué te puedo ayudar?',
          timestamp: new Date(),
        };
        setMessages([fallback]);
      } finally {
        setIsTyping(false);
        setIsInitializing(false);
      }
    }

    init();
  }, []);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Mark user message as "sent" first, then "read" when agent responds
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history,
        }),
      });
      const data = await res.json();

      const agentMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      // Mark user message as "read" when agent responds
      setReadMessages((prev) => new Set([...prev, userMsg.id]));
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Un momento, estamos teniendo inconvenientes técnicos. Volvé a intentar en un segundo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const businessInitial = config.business_name?.[0]?.toUpperCase() || 'N';

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F0EDE7',
        fontFamily: "'Sora', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── VORA Branding Header ── */}
      <div
        style={{
          background: '#F0EDE7',
          borderBottom: '1px solid #E5E2DC',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <img
          src="/aria2.png"
          alt="ARIA"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            border: '1.5px solid #E5E2DC',
          }}
        />
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
            Estás probando ARIA
          </div>
          <div style={{ fontSize: 11, color: '#6B6B6B' }}>
            el asistente inteligente de{' '}
            <span style={{ fontWeight: 600, color: '#1A1A1A' }}>Vora IA</span>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href="/admin"
            title="Panel de configuración"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 500,
              color: '#6B6B6B',
              textDecoration: 'none',
              padding: '6px 12px',
              border: '1px solid #E5E2DC',
              borderRadius: 20,
              background: '#fff',
            }}
          >
            ⚙ Config
          </a>
        </div>
      </div>

      {/* ── WhatsApp Chat ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxWidth: 520,
          width: '100%',
          margin: '0 auto',
          alignSelf: 'stretch',
          background: '#fff',
        }}
      >
        {/* WA Header */}
        <div
          style={{
            background: WA_GREEN,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: WA_DARK_GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            {businessInitial}
          </div>
          <div>
            <div
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1.2,
              }}
            >
              {config.business_name || 'Negocio'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#4ade80',
                }}
              />
              en línea
            </div>
          </div>

          {/* WA icons placeholder */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, opacity: 0.6 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
            </svg>
          </div>
        </div>

        {/* Messages Area */}
        <div
          className="wa-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 12px 8px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C5B8AD' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: WA_BG,
          }}
        >
          {isInitializing && messages.length === 0 && (
            <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 12 }}>
              <TypingIndicator />
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'assistant' ? (
              // Agent message (left)
              <div
                key={msg.id}
                className="message-bubble"
                style={{ display: 'flex', marginBottom: 8, paddingLeft: 12 }}
              >
                <div
                  className="bubble-agent"
                  style={{
                    background: AGENT_BUBBLE,
                    borderRadius: '0 12px 12px 12px',
                    padding: '8px 12px 6px',
                    maxWidth: '78%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: '#111',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </p>
                  <div
                    style={{
                      textAlign: 'right',
                      marginTop: 3,
                      fontSize: 11,
                      color: '#8696a0',
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ) : (
              // User message (right)
              <div
                key={msg.id}
                className="message-bubble"
                style={{ display: 'flex', marginBottom: 8, justifyContent: 'flex-end', paddingRight: 12 }}
              >
                <div
                  className="bubble-user"
                  style={{
                    background: USER_BUBBLE,
                    borderRadius: '12px 0 12px 12px',
                    padding: '8px 12px 6px',
                    maxWidth: '78%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: '#111',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 2,
                      marginTop: 3,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#8696a0' }}>{formatTime(msg.timestamp)}</span>
                    <CheckMark read={readMessages.has(msg.id)} />
                  </div>
                </div>
              </div>
            )
          )}

          {isTyping && !isInitializing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          style={{
            background: '#f0f2f5',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            borderTop: '1px solid #e9edef',
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribí un mensaje"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isInitializing}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: '#111',
                background: 'transparent',
                padding: '11px 0',
                fontFamily: "'Sora', sans-serif",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: inputText.trim() && !isTyping ? WA_GREEN : '#8696a0',
              border: 'none',
              cursor: inputText.trim() && !isTyping ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

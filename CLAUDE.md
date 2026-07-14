# VORA DEMO — Guía para Claude

## ¿Qué es este proyecto?

Mini-app de demo para mostrarle a prospectos cómo funciona un agente IA de Vora en WhatsApp.
**No** es el sitio web de Vora (eso está en `/Users/francodelavega/vora-web`).
**No** es RutaRep (eso está en `/Users/francodelavega/Dev.Proyectos/rutarep`).

## Dos rutas principales

| Ruta | Quién la ve | Qué hace |
|------|-------------|----------|
| `/admin` | Solo Franco (password en .env.local) | Configura cómo se comporta ARIA antes de mandar el link al prospecto |
| `/demo` | El prospecto (link público) | Chat estilo WhatsApp donde el agente responde según la config activa |

## Stack

- **Next.js 15** + TypeScript + Tailwind 4
- **Supabase**: proyecto "Vora Rep" (`lvunfrsixhormufxooln`). Solo usamos la tabla `demo_config` (una fila, id=1). No tocamos las otras tablas de RutaRep.
- **Anthropic SDK**: modelo `claude-sonnet-4-6` para las respuestas del agente
- **Deploy**: Vercel. Repo: `github.com/frankodlv77/Vora-Agentes-IAs`

## Arquitectura de datos

```
demo_config (una sola fila, id=1)
  ↓ se actualiza desde /admin
  ↓ se lee en cada mensaje desde /api/chat
  ↓ buildSystemPrompt() arma un prompt largo y específico
  ↓ Claude responde como ARIA, el agente del negocio configurado
```

## Archivos clave

```
lib/
  types.ts          → Interfaz DemoConfig + DEFAULT_CONFIG + INDUSTRY_NAMES
  supabase.ts       → Cliente Supabase (usa env vars del .env.local)
  promptBuilder.ts  → buildSystemPrompt(config) — LA LÓGICA CENTRAL

app/
  admin/page.tsx    → Panel de config (autenticado con password simple vía sessionStorage)
  demo/page.tsx     → Chat WhatsApp (UI fiel, greeting auto-generado por Claude al cargar)
  api/
    config/route.ts       → GET (lee config) / POST (upsert config id=1)
    admin/auth/route.ts   → POST {password} → compara con ADMIN_PASSWORD env var
    chat/route.ts         → POST {message, history, init} → llama a Claude con system prompt dinámico

public/
  aria2.png         → Imagen de ARIA (copiada de /vora-web/public/aria2.png)
```

## Cómo corre en local

```bash
cd /Users/francodelavega/Dev.Proyectos/vora-demo
npm install
# Agregar ANTHROPIC_API_KEY real en .env.local
npm run dev
```

- `/demo` → chat público (se puede abrir en incógnito para simular el prospecto)
- `/admin` → panel de config (password: ver ADMIN_PASSWORD en .env.local)

## Lógica del system prompt (promptBuilder.ts)

`buildSystemPrompt(config)` combina todos los campos de `demo_config` para armar un prompt largo con:
1. Identidad del negocio (nombre, rubro, servicios, horarios)
2. Tono con ejemplos concretos (formal=usted / informal=vos coloquial argentino)
3. Target de edad (adulto / joven)
4. Nivel de emojis y largo de respuesta
5. Enfoque funcional (atención pura / venta suave / venta activa)
6. Toggles: agenda turnos, seguimiento frío, derivación a humano
7. Proactividad y rasgo de personalidad
8. Reglas absolutas (nunca romper personaje, nunca admitir ser IA genérica)

**El objetivo**: que cambiar de "clínica dental formal" a "gimnasio informal venta activa" sea una diferencia BRUTAL en el primer mensaje.

## UI del chat (/demo)

Simula WhatsApp real:
- Header verde (#128C7E) con avatar generado del inicial del negocio + "en línea"
- Burbujas: usuario derecha (verde #D9FDD3 + tail CSS) / agente izquierda (blanco + tail CSS)
- Fondo: #E5DDD5 con patrón SVG sutil
- Typing indicator: 3 puntos animados mientras Claude responde
- Double checkmarks: grises → azules cuando el agente responde
- Auto-scroll al último mensaje
- Al cargar: Claude genera el saludo inicial automáticamente (POST /api/chat con `init: true`)

Fuera del chat (wrapper VORA):
- Fondo crema #F0EDE7
- Header con aria2.png + "Estás probando ARIA / el asistente de Vora IA"
- Paleta monocromática (sin verde de WhatsApp afuera del chat, sin gradientes)

## Auth del admin

- `POST /api/admin/auth` compara password con `process.env.ADMIN_PASSWORD` (server-side)
- Si correcto → el cliente guarda `sessionStorage.setItem('vora_admin', 'true')`
- Al recargar → chequea sessionStorage antes de mostrar el panel
- No hay JWT ni cookies — es un panel privado, alcanza con esto

## Supabase: nota importante

Este proyecto usa el mismo proyecto Supabase que RutaRep ("Vora Rep").
La tabla `demo_config` no tiene RLS (no es necesario — es solo una fila de config interna).
Las demás tablas de RutaRep sí tienen RLS activo y no se tocan desde acá.

Si en algún momento se crea un proyecto Supabase propio para este demo, actualizar:
- `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`
- Y las env vars en Vercel también

## Deploy en Vercel

Repo: `github.com/frankodlv77/Vora-Agentes-IAs`
Agregar en Vercel las mismas env vars que el `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `ADMIN_PASSWORD`

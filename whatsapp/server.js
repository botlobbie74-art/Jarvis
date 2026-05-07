import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pkg from 'whatsapp-web.js';
import dotenv from 'dotenv';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const { Client, LocalAuth } = pkg;
dotenv.config({ path: '../backend/.env' });

const PORT = process.env.WA_PORT || 8002;
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: ws },
});

// session per user_id (in-memory). For prod use a session store.
const sessions = new Map(); // user_id -> { client, qr, status, ready }

function getOrCreateSession(userId) {
  if (sessions.has(userId)) return sessions.get(userId);
  const s = { client: null, qr: null, status: 'init', ready: false };
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId, dataPath: '/tmp/wa-sessions' }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true },
  });
  client.on('qr', async (qr) => {
    s.qr = await qrcode.toDataURL(qr);
    s.status = 'qr';
    console.log(`[wa:${userId}] QR ready`);
  });
  client.on('ready', async () => {
    s.ready = true; s.status = 'connected'; s.qr = null;
    console.log(`[wa:${userId}] ready`);
    await sb.from('jarvis_plugins').upsert({
      user_id: userId, plugin_id: 'whatsapp', plugin_name: 'WhatsApp',
      status: 'connected', connected_at: new Date().toISOString(),
      metadata: { device: 'whatsapp-web.js' },
    }, { onConflict: 'user_id,plugin_id' });
  });
  client.on('disconnected', async () => {
    s.ready = false; s.status = 'disconnected';
    console.log(`[wa:${userId}] disconnected`);
  });
  client.on('message', async (msg) => {
    // Could be wired to LLM auto-reply via main backend.
    console.log(`[wa:${userId}] msg from ${msg.from}: ${msg.body.slice(0, 80)}`);
  });
  client.initialize().catch((e) => { s.status = 'error'; console.error(e); });
  s.client = client;
  sessions.set(userId, s);
  return s;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/wa/health', (_, res) => res.json({ ok: true, sessions: sessions.size }));

app.post('/wa/start', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const s = getOrCreateSession(user_id);
  res.json({ status: s.status, has_qr: !!s.qr });
});

app.get('/wa/status/:userId', (req, res) => {
  const s = sessions.get(req.params.userId);
  if (!s) return res.json({ status: 'not_started', qr: null });
  res.json({ status: s.status, qr: s.qr, ready: s.ready });
});

app.post('/wa/send', async (req, res) => {
  const { user_id, to, message } = req.body;
  const s = sessions.get(user_id);
  if (!s || !s.ready) return res.status(400).json({ error: 'not connected' });
  try {
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    await s.client.sendMessage(chatId, message);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
});

app.post('/wa/logout', async (req, res) => {
  const { user_id } = req.body;
  const s = sessions.get(user_id);
  if (s?.client) { try { await s.client.logout(); } catch (_) {} }
  sessions.delete(user_id);
  await sb.from('jarvis_plugins').update({ status: 'disconnected' })
    .eq('user_id', user_id).eq('plugin_id', 'whatsapp');
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Jarvis WhatsApp service on :${PORT}`));

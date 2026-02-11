const express = require('express');
const cors = require('cors');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const socketIo = require('socket.io');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist'))); // Frontend serve

// Database
const dbPath = path.join(__dirname, 'database', 'henryx.db');
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath));

const db = new sqlite3.Database(dbPath);
db.run(`CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE,
  status TEXT DEFAULT 'disconnected',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  session_id INTEGER,
  to_number TEXT,
  message TEXT,
  status TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const sessions = new Map();

app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 HenryX WhatsApp Panel Backend</h1>
    <p>API working! Frontend: <a href="/">${req.get('host')}/</a></p>
  `);
});

// Create Session
app.post('/api/create-session', async (req, res) => {
  const { sessionName } = req.body;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./database/${sessionName}`);
    
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        const qrData = await qrcode.toDataURL(qr);
        io.emit('qr', { sessionName, qr: qrData });
      }
      
      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) {
          app.post('/api/create-session', { sessionName });
        }
      }
      
      if (connection === 'open') {
        db.run('INSERT OR REPLACE INTO sessions (name, status) VALUES (?, ?)', [sessionName, 'connected']);
        io.emit('connected', { sessionName });
        sessions.set(sessionName, sock);
      }
    });

    res.json({ success: true, message: 'Session created, scan QR' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send Message
app.post('/api/send-message', async (req, res) => {
  const { sessionName, phone, message } = req.body;
  const sock = sessions.get(sessionName);
  
  if (!sock) return res.status(400).json({ error: 'No active session' });
  
  try {
    await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: message });
    
    db.run('INSERT INTO messages (session_id, to_number, message, status) VALUES (?, ?, ?, ?)', 
           [sessionName, phone, message, 'sent']);
    
    io.emit('message-sent', { phone, message });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Sessions
app.get('/api/sessions', (req, res) => {
  db.all('SELECT * FROM sessions ORDER BY created_at DESC', (err, rows) => {
    res.json(rows || []);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 HenryX Backend: http://localhost:${PORT}`);
});

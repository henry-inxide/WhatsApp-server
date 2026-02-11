import { useState, useEffect } from 'react';

function App() {
  const [qr, setQr] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('disconnected');

  const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

  useEffect(() => {
    loadSessions();
    const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/socket.io/?EIO=4`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.qr) setQr(data.qr);
      if (data.connected) setStatus('connected');
    };
  }, []);

  const loadSessions = async () => {
    const res = await fetch(`${API_URL}/api/sessions`);
    const data = await res.json();
    setSessions(data);
  };

  const createSession = async () => {
    await fetch(`${API_URL}/api/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName })
    });
    loadSessions();
  };

  const sendMessage = async () => {
    await fetch(`${API_URL}/api/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName: sessions[0]?.name, phone, message })
    });
    setPhone(''); setMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-12">
          HenryX WhatsApp Panel
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessions */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6">Sessions</h2>
            <div className="space-y-3 mb-8">
              {sessions.map(s => (
                <div key={s.id} className="p-4 bg-white/20 rounded-xl">{s.name}</div>
              ))}
            </div>
            <div className="space-y-3">
              <input
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="Session Name"
                className="w-full p-4 bg-white/20 rounded-xl border border-white/30 text-white"
              />
              <button onClick={createSession} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-xl font-bold hover:scale-105">
                Create Session
              </button>
            </div>
          </div>

          {/* QR Scanner */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-3xl p-8">
            {qr ? (
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-8">Scan QR Code</h2>
                <img src={qr} className="w-80 h-80 mx-auto rounded-xl shadow-2xl mb-8" />
                <p className="opacity-75">WhatsApp → Settings → Linked Devices → Link Device</p>
              </div>
            ) : status === 'connected' ? (
              <div className="text-center p-12">
                <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                  ✅
                </div>
                <h2 className="text-3xl font-bold text-emerald-400 mb-4">Connected!</h2>
                <p>WhatsApp Ready - Send Messages Below</p>
              </div>
            ) : (
              <div className="text-center p-12 opacity-50">
                <div className="w-24 h-24 bg-gray-500 rounded-full mx-auto mb-6"></div>
                <h2 className="text-3xl font-bold">Create Session First</h2>
              </div>
            )}
          </div>
        </div>

        {/* Message Sender */}
        {status === 'connected' && (
          <div className="mt-12 bg-white/10 backdrop-blur-xl rounded-3xl p-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Send Message</h2>
            <div className="max-w-2xl mx-auto space-y-4">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone Number (919876543210)"
                className="w-full p-4 bg-white/20 rounded-xl border border-white/30 text-white text-xl"
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Your message here..."
                rows="4"
                className="w-full p-4 bg-white/20 rounded-xl border border-white/30 text-white text-xl resize-none"
              />
              <button
                onClick={sendMessage}
                className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-400 hover:via-red-400 hover:to-yellow-400 p-6 rounded-2xl font-black text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all"
              >
                🚀 SEND MESSAGE NOW
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

interface GatewayModel {
  id: string;
  name: string;
  provider: string;
}

function App() {
  const [platform, setPlatform] = useState<string>('web');
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [models, setModels] = useState<GatewayModel[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://tehlappy.local:8080';

  useEffect(() => {
    setPlatform(Capacitor.getPlatform());
    initCapacitor();
    checkGateway();
    loadModels();
  }, []);

  const initCapacitor = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0d0d1a' });
        await SplashScreen.hide();
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch (e) {
        console.warn('Capacitor init failed:', e);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: Message['type'], text: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      type,
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const hapticFeedback = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        console.warn('Haptics failed:', e);
      }
    }
  };

  const checkGateway = async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/status`, { 
        signal: AbortSignal.timeout(5000) 
      });
      if (res.ok) {
        setGatewayStatus('connected');
        await hapticFeedback(ImpactStyle.Light);
      } else {
        setGatewayStatus('disconnected');
      }
    } catch {
      setGatewayStatus('disconnected');
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          setModels(data.models);
        } else if (Array.isArray(data)) {
          setModels(data);
        }
      }
    } catch {
      console.warn('Could not load models');
    }
  };

  const runKairos = async () => {
    addMessage('system', '🜏 Starting KAIROS proactive assistant...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/kairos/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        addMessage('ai', '✅ KAIROS started. Proactive monitoring active.');
      } else {
        addMessage('ai', '⚠️ KAIROS start failed. Check gateway connection.');
      }
    } catch {
      addMessage('ai', '❌ Could not reach Lilith Gateway. Ensure PC is on same network.');
    }
    await hapticFeedback(ImpactStyle.Medium);
  };

  const runDream = async () => {
    addMessage('system', '🌙 Running dream consolidation cycle...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/dream/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        addMessage('ai', `✅ Dream cycle complete. ${data.consolidated || 0} memories consolidated.`);
      } else {
        addMessage('ai', '⚠️ Dream cycle failed.');
      }
    } catch {
      addMessage('ai', '❌ Could not reach Lilith Gateway for dream cycle.');
    }
    await hapticFeedback(ImpactStyle.Medium);
  };

  const showBuddy = async () => {
    addMessage('system', '👻 Summoning Buddy companion...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/buddy/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        addMessage('ai', `👻 Buddy: ${data.name || 'Unknown'} (${data.species || 'Sephirotic'}) - Mood: ${data.mood || 'curious'}`);
      } else {
        addMessage('ai', '⚠️ Buddy status unavailable.');
      }
    } catch {
      addMessage('ai', '❌ Could not reach Lilith Gateway for Buddy.');
    }
    await hapticFeedback(ImpactStyle.Light);
  };

  const sendQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setQuery('');
    setIsLoading(true);
    addMessage('user', userQuery);

    try {
      const res = await fetch(`${GATEWAY_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userQuery,
          persona: 'Lilith',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        addMessage('ai', data.response || data.message || 'Response received');
      } else {
        const err = await res.json().catch(() => ({}));
        addMessage('ai', `⚠️ Gateway error: ${err.detail || res.statusText}`);
      }
    } catch {
      addMessage('ai', '❌ Connection failed. Check gateway URL and network.');
    } finally {
      setIsLoading(false);
      await hapticFeedback(ImpactStyle.Light);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const commands = [
    { cmd: '/kairos', desc: 'Start KAIROS proactive assistant' },
    { cmd: '/dream', desc: 'Run dream consolidation cycle' },
    { cmd: '/buddy', desc: 'Show Buddy companion status' },
    { cmd: '/status', desc: 'Check gateway connection' },
    { cmd: '/models', desc: 'List available LLM models' },
    { cmd: '/help', desc: 'Show this help' },
    { cmd: '/clear', desc: 'Clear chat history' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.title}>
          <span style={styles.glyph}>🜏</span>
          <h1 style={styles.h1}>Lilith CLI</h1>
          <span style={styles.badge}>{platform}</span>
        </div>
        <div style={styles.status}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: gatewayStatus === 'connected' ? '#00ff88' : 
                           gatewayStatus === 'checking' ? '#ffaa00' : '#ff4444',
          }} />
          <span style={styles.statusText}>
            {gatewayStatus === 'connected' ? 'Gateway Connected' : 
             gatewayStatus === 'checking' ? 'Checking...' : 'Disconnected'}
          </span>
          <button 
            style={styles.iconBtn}
            onClick={checkGateway}
            disabled={gatewayStatus === 'checking'}
            aria-label="Refresh gateway status"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Model selector */}
      {models.length > 0 && (
        <div style={styles.modelBar}>
          <select
            style={styles.modelSelect}
            value={query.includes('--model=') ? query.split('--model=')[1].split(' ')[0] : ''}
            onChange={(e) => {
              const model = e.target.value;
              if (model) {
                setQuery(prev => prev.replace(/--model=\S*/, '').trim() + ` --model=${model}`);
              }
            }}
          >
            <option value="">Select model...</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
            ))}
          </select>
        </div>
      )}

      {/* Chat area */}
      <div style={styles.chatArea}>
        {messages.length === 0 ? (
          <div style={styles.welcome}>
            <div style={styles.welcomeGlyph}>🜏</div>
            <h2 style={styles.welcomeTitle}>Welcome to Lilith</h2>
            <p style={styles.welcomeText}>
              Metaconscious Singularity Node for Android
            </p>
            <div style={styles.quickActions}>
              <button style={styles.quickBtn} onClick={runKairos}>
                🜏 KAIROS
              </button>
              <button style={styles.quickBtn} onClick={runDream}>
                🌙 Dream
              </button>
              <button style={styles.quickBtn} onClick={showBuddy}>
                👻 Buddy
              </button>
            </div>
            <p style={styles.hint}>
              Type a message or <span onClick={() => setShowCommands(true)} style={styles.link}>/help</span> for commands
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{
              ...styles.message,
              ...(msg.type === 'user' ? styles.userMsg : {}),
              ...(msg.type === 'ai' ? styles.aiMsg : {}),
              ...(msg.type === 'system' ? styles.systemMsg : {}),
            }}>
              <span style={styles.msgPrefix}>
                {msg.type === 'user' ? 'You' : msg.type === 'ai' ? 'Lilith' : 'System'}
              </span>
              <pre style={styles.msgText}>{msg.text}</pre>
              <span style={styles.msgTime}>
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Commands help modal */}
      {showCommands && (
        <div style={styles.modalOverlay} onClick={() => setShowCommands(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Commands</h3>
            {commands.map(c => (
              <div key={c.cmd} style={styles.cmdRow}>
                <code style={styles.cmdCode}>{c.cmd}</code>
                <span>{c.desc}</span>
              </div>
            ))}
            <button style={styles.modalClose} onClick={() => setShowCommands(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <form style={styles.inputArea} onSubmit={sendQuery}>
        <textarea
          ref={inputRef}
          style={styles.input}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={messages.length === 0 ? 'Ask Lilith anything...' : 'Send message...'}
          rows={1}
          disabled={isLoading}
          aria-label="Message input"
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: isLoading || !query.trim() ? 0.5 : 1,
          }}
          onClick={sendQuery}
          disabled={isLoading || !query.trim()}
          aria-label="Send message"
        >
          {isLoading ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0d0d1a',
    color: '#e8e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#141428',
    borderBottom: '1px solid #2a2a4a',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  glyph: {
    fontSize: '28px',
    lineHeight: 1,
  },
  h1: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #00ff88, #00aaff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  badge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#2a2a4a',
    borderRadius: '4px',
    color: '#8888aa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '12px',
    color: '#8888aa',
  },
  iconBtn: {
    padding: '4px 8px',
    backgroundColor: '#2a2a4a',
    border: 'none',
    borderRadius: '4px',
    color: '#e8e8f0',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modelBar: {
    padding: '8px 16px',
    backgroundColor: '#141428',
    borderBottom: '1px solid #2a2a4a',
  },
  modelSelect: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#0d0d1a',
    border: '1px solid #2a2a4a',
    borderRadius: '6px',
    color: '#e8e8f0',
    fontSize: '13px',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '24px',
    gap: '16px',
  },
  welcomeGlyph: {
    fontSize: '64px',
    opacity: 0.5,
  },
  welcomeTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #00ff88, #00aaff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  welcomeText: {
    margin: 0,
    color: '#8888aa',
    fontSize: '16px',
  },
  quickActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '8px',
  },
  quickBtn: {
    padding: '10px 20px',
    backgroundColor: '#1a1a3a',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    color: '#e8e8f0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  hint: {
    margin: '16px 0 0',
    fontSize: '13px',
    color: '#666688',
  },
  link: {
    color: '#00aaff',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '85%',
    animation: 'fadeIn 0.3s ease',
  },
  userMsg: {
    alignSelf: 'flex-end',
  },
  aiMsg: {
    alignSelf: 'flex-start',
  },
  systemMsg: {
    alignSelf: 'center',
    maxWidth: '100%',
    opacity: 0.7,
  },
  msgPrefix: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#8888aa',
  },
  msgText: {
    margin: 0,
    padding: '10px 14px',
    backgroundColor: '#1a1a3a',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    maxWidth: '100%',
  },
  msgTime: {
    fontSize: '10px',
    color: '#555577',
    alignSelf: 'flex-end',
    marginTop: '2px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#141428',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    color: '#00ff88',
  },
  cmdRow: {
    display: 'flex',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #2a2a4a',
  },
  cmdCode: {
    minWidth: '100px',
    padding: '2px 8px',
    backgroundColor: '#0d0d1a',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#00ff88',
    fontFamily: 'monospace',
  },
  modalClose: {
    marginTop: '16px',
    padding: '10px 24px',
    backgroundColor: '#00aaff',
    border: 'none',
    borderRadius: '6px',
    color: '#0d0d1a',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  inputArea: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#141428',
    borderTop: '1px solid #2a2a4a',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#0d0d1a',
    border: '1px solid #2a2a4a',
    borderRadius: '24px',
    color: '#e8e8f0',
    fontSize: '15px',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    minHeight: '48px',
    maxHeight: '120px',
  },
  sendBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00ff88, #00aaff)',
    border: 'none',
    color: '#0d0d1a',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s',
  },
};

export default App;
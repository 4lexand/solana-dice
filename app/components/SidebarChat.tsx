'use client';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Pusher from 'pusher-js';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  walletAddress: string;
  timestamp: string;
}

// Generador de nombres simple sin librerías externas para evitar errores
const ADJETIVOS = ['Cyber', 'Degen', 'Super', 'Mega', 'Hyper', 'Neon', 'Based', 'Solana', 'Lucky', 'Fast'];
const ANIMALES = ['Ape', 'Dog', 'Cat', 'Bull', 'Bear', 'Whale', 'Shark', 'Pepe', 'Doge', 'Chad'];

export default function SidebarChat() {
  const { publicKey, connected } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [myTempName, setMyTempName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Generar nombre
  useEffect(() => {
    if (connected && publicKey) {
      const addrStr = publicKey.toBase58();
      // Usamos la dirección para elegir siempre el mismo nombre
      const adjIndex = addrStr.charCodeAt(0) % ADJETIVOS.length;
      const aniIndex = addrStr.charCodeAt(1) % ANIMALES.length;
      const shortAddr = addrStr.slice(0, 4);
      setMyTempName(`${ADJETIVOS[adjIndex]}-${ANIMALES[aniIndex]}-${shortAddr}`);
    } else {
      setMyTempName('');
    }
  }, [connected, publicKey]);

  // 2. Conectar a Pusher
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!appKey || !cluster) {
      console.log("Chat: Faltan claves en .env.local");
      return;
    }

    const pusher = new Pusher(appKey, { cluster: cluster });
    const channel = pusher.subscribe('global-chat');

    channel.bind('new-message', (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      pusher.unsubscribe('global-chat');
      pusher.disconnect();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Enviar mensaje
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !connected) return;
    setIsSending(true);

    try {
      await fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          username: myTempName,
          walletAddress: publicKey?.toBase58()
        }),
      });
      setInputMessage(''); 
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-full relative font-mono">
      {/* Cabecera */}
      <div className="p-4 border-b border-gray-800 bg-black/40">
        <h2 className="text-purple-400 font-bold text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          LIVE CHAT
        </h2>
        {connected && <p className="text-xs text-gray-400 mt-1">Alias: {myTempName}</p>}
      </div>

      {/* Lista Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs mt-10">
            No hay mensajes aún...
          </div>
        )}
        {messages.map((msg, idx) => {
            const isMe = msg.walletAddress === publicKey?.toBase58();
            return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                     <span className={`text-[10px] mb-1 font-bold ${isMe ? 'text-blue-400' : 'text-pink-400'}`}>{msg.username}</span>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs break-words ${isMe ? 'bg-blue-600/90 text-white' : 'bg-gray-800 text-gray-300'}`}>
                        {msg.message}
                    </div>
                </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-800 bg-black/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={connected ? "Chat here..." : "Connect wallet"}
            disabled={!connected || isSending}
            className="flex-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:outline-none focus:border-purple-500 px-3 py-2 placeholder-gray-500"
          />
          <button type="submit" disabled={!connected || isSending || !inputMessage.trim()}
            className="bg-purple-600 text-white p-2 rounded text-xs font-bold disabled:opacity-50 hover:bg-purple-500 transition-colors">
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
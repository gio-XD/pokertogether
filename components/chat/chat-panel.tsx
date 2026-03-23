'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/components/providers/socket-provider';
import { useGame } from '@/components/providers/game-provider';
import type { ChatMessage } from '@/lib/engine/types';

export function ChatPanel() {
  const { socket } = useSocket();
  const { sendChat } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-100), msg]);
    };
    socket.on('table:chat-message', handler);
    return () => { socket.off('table:chat-message', handler); };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChat(input.trim());
    setInput('');
  };

  return (
    <div className="w-64 bg-[var(--panel-bg)] border-l border-[var(--panel-border)] flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--panel-border)]">
        <span className="text-xs font-medium text-white/50">聊天</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {messages.map((msg, i) => (
          <div key={i} className="text-xs">
            <span className="font-medium text-[var(--gold)]">{msg.playerName}: </span>
            <span className="text-white/70">{msg.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-[var(--panel-border)]">
        <div className="flex gap-1">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="说点什么..."
            maxLength={200}
            className="flex-1 px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white
              placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            onClick={handleSend}
            className="px-2 py-1.5 rounded-lg text-xs bg-white/5 text-white/50
              hover:bg-white/10 hover:text-white transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

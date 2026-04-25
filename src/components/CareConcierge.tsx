'use client';

import { useState, useRef, useEffect } from 'react';
import { FiMessageCircle, FiX, FiSend, FiLoader } from 'react-icons/fi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'What\'s the difference between memory care and assisted living?',
  'How much does assisted living cost in Cleveland?',
  'Does Medicare pay for assisted living?',
  'What questions should I ask on a tour?',
];

export default function CareConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your CareLinkAI care advisor. I can help you understand care options, navigate costs, and find the right home for your loved one. What\'s on your mind?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/care-concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all ${open ? 'hidden' : ''}`}
        aria-label="Open care advisor"
      >
        <FiMessageCircle size={20} />
        <span className="text-sm font-medium">Ask a Care Advisor</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-1.5rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <FiMessageCircle size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">Care Advisor</p>
                <p className="text-xs text-primary-200">CareLinkAI · Always available</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
              <FiX size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-neutral-100 text-neutral-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-3 py-2">
                  <FiLoader size={14} className="animate-spin text-neutral-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Starter chips — only show before first user message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-neutral-100 flex gap-2 flex-shrink-0">
            <input
              className="flex-1 text-sm border border-neutral-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Ask anything about senior care…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex-shrink-0"
            >
              <FiSend size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

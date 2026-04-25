'use client';

import { useState, useRef } from 'react';
import { FiZap, FiSend, FiLoader } from 'react-icons/fi';

const EXAMPLE_QUESTIONS = [
  'How many residents do I have?',
  'Show me caregivers with reliability below 60',
  'What shifts are unassigned this week?',
  'How is my occupancy rate?',
];

export default function AskAIWidget() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const res = await fetch('/api/operator/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-full bg-indigo-100 p-1.5">
          <FiZap size={14} className="text-indigo-600" />
        </div>
        <h3 className="font-semibold text-neutral-800 text-sm">Ask AI About Your Dashboard</h3>
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(question)}
          placeholder="Ask anything about your residents, caregivers, or shifts..."
          className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={() => ask(question)}
          disabled={loading || !question.trim()}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
        >
          {loading ? <FiLoader size={16} className="animate-spin" /> : <FiSend size={16} />}
        </button>
      </div>

      {!answer && !error && !loading && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { setQuestion(q); ask(q); }}
              className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <FiLoader size={14} className="animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {answer && (
        <div className="mt-3 rounded-lg bg-white border border-indigo-100 p-3 text-sm text-neutral-700 whitespace-pre-wrap">
          {answer}
          <button
            onClick={() => { setAnswer(''); setQuestion(''); inputRef.current?.focus(); }}
            className="mt-2 text-xs text-indigo-500 hover:underline block"
          >
            Ask another question
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

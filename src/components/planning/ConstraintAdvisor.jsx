import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Minimize2, Send, ShieldAlert, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ConstraintAdvisor({ enabled, onToggle }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Start a conversation on first open
  useEffect(() => {
    if (open && !conversation) {
      base44.agents.createConversation({
        agent_name: 'constraint_advisor',
        metadata: { name: 'Constraint Help' },
      }).then(conv => {
        setConversation(conv);
        setMessages(conv.messages || []);
      });
    }
  }, [open, conversation]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !conversation) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!enabled) return null;

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-4 left-4 z-[1500] flex items-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-2xl transition-all hover:scale-105"
          title="Open Constraint Advisor"
        >
          <ShieldAlert className="w-4 h-4" />
          Constraint Advisor
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="absolute bottom-4 left-4 z-[1500] bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: '320px', height: '440px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-500/10 border-b border-purple-500/30 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-xs font-semibold text-purple-300 flex-1">Constraint Advisor</span>
            <button onClick={() => setOpen(false)} className="p-0.5 text-slate-500 hover:text-white">
              <Minimize2 className="w-3 h-3" />
            </button>
            <button onClick={() => { setOpen(false); onToggle(false); }} className="p-0.5 text-slate-500 hover:text-white" title="Disable advisor">
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && !conversation && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              </div>
            )}
            {messages.length === 0 && conversation && (
              <div className="text-center py-6">
                <ShieldAlert className="w-8 h-8 text-purple-400/40 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Ask me anything about constraint mapping — exclusion zones, setbacks, layer imports, and more.</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              if (!msg.content) return null;
              return (
                <div key={i} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                    isUser
                      ? 'bg-purple-600/30 text-purple-100 border border-purple-500/30'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  )}>
                    {isUser ? msg.content : (
                      <ReactMarkdown
                        className="prose prose-invert prose-xs max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0"
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 shrink-0 border-t border-slate-800">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about constraints…"
                rows={1}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none resize-none focus:border-purple-500/60"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending || !conversation}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
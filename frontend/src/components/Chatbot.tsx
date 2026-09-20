import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { fetchChat } from '../api/client'
import type { ChatContext } from '../api/client'

interface ChatbotProps {
  context: ChatContext
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chatbot({ context }: ChatbotProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your FarmAI assistant 🌱. I can explain your crop advisory, discuss disease results, or answer questions about weather and soil conditions. What would you like to know?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetchChat(text, context, history)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        id="chatbot-toggle"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center
                    shadow-xl shadow-forest-900/60 transition-all duration-300
                    ${open ? 'bg-dark-600 border border-dark-500' : 'bg-forest-600 hover:bg-forest-500 animate-pulse-green'}`}
        aria-label="Toggle chat assistant"
      >
        {open ? (
          <X className="w-5 h-5 text-gray-300" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] h-[480px]
                     glass-card border-forest-800/40 shadow-2xl shadow-dark-900/80
                     flex flex-col overflow-hidden animate-slide-up"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-forest-900/50 border-b border-forest-800/30 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-forest-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">FarmAI Assistant</p>
              <p className="text-xs text-forest-400">Crop & Disease Expert</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-forest-400 animate-pulse" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 chat-message ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                                 ${msg.role === 'user' ? 'bg-forest-700' : 'bg-dark-500'}`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-forest-200" />
                    : <Bot className="w-3.5 h-3.5 text-gray-300" />
                  }
                </div>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-forest-700/70 text-white rounded-tr-sm'
                      : 'bg-dark-600/80 text-gray-200 rounded-tl-sm border border-dark-500/50'
                    }`}
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-forest-300">$1</strong>').replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-dark-500 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-gray-300" />
                </div>
                <div className="bg-dark-600/80 border border-dark-500/50 rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 text-forest-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-dark-600/50 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your advisory…"
              className="flex-1 bg-dark-600/60 border border-dark-500/60 focus:border-forest-600/60
                         rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors"
              disabled={loading}
              id="chat-input"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-forest-600 hover:bg-forest-500 disabled:opacity-40
                         flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

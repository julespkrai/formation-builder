'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Send, MessageSquare, Edit2, Check, Maximize2, Minimize2, X } from 'lucide-react'
import type { AiConversation, AiMessage } from '@/lib/types'

type Props = {
  formationId: string
  courseId?: string
  moduleId?: string
  courseContext?: { title: string; intro: string | null }
  demoMode?: boolean
}

type LocalConversation = {
  id: string
  title: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export default function AiChatPanel({ formationId, courseId, moduleId, courseContext, demoMode }: Props) {
  const supabase = createClient()

  // Demo mode: all local
  const [demoConvs, setDemoConvs] = useState<LocalConversation[]>([])
  const [demoActiveId, setDemoActiveId] = useState<string | null>(null)

  // Production mode: DB backed
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  // Shared
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleInput, setTitleInput] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, demoConvs, demoActiveId])

  // Load conversations (production)
  useEffect(() => {
    if (demoMode) return
    const params = new URLSearchParams({ formationId })
    if (courseId) params.set('courseId', courseId)
    else if (moduleId) params.set('moduleId', moduleId)
    fetch(`/api/ai/conversations?${params}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConversations(data) })
  }, [demoMode, formationId, courseId, moduleId])

  // Load messages when conversation selected (production)
  useEffect(() => {
    if (demoMode || !activeConvId) return
    setLoadingMsgs(true)
    supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', activeConvId)
      .order('created_at')
      .then(({ data }) => {
        setMessages((data ?? []) as AiMessage[])
        setLoadingMsgs(false)
      })
  }, [activeConvId, demoMode, supabase])

  const createConversation = async () => {
    if (demoMode) {
      const conv: LocalConversation = {
        id: crypto.randomUUID(),
        title: `Discussion ${demoConvs.length + 1}`,
        messages: [],
      }
      setDemoConvs(prev => [conv, ...prev])
      setDemoActiveId(conv.id)
      return
    }
    const res = await fetch('/api/ai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formationId,
        courseId: courseId ?? null,
        moduleId: moduleId ?? null,
        title: `Discussion ${conversations.length + 1}`,
      }),
    })
    if (res.ok) {
      const conv = await res.json()
      setConversations(prev => [conv, ...prev])
      setActiveConvId(conv.id)
      setMessages([])
    }
  }

  const deleteConversation = async (id: string) => {
    if (demoMode) {
      setDemoConvs(prev => prev.filter(c => c.id !== id))
      if (demoActiveId === id) setDemoActiveId(null)
      return
    }
    await fetch(`/api/ai/conversations?id=${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) { setActiveConvId(null); setMessages([]) }
  }

  const saveTitle = async (id: string) => {
    if (!demoMode) {
      await supabase.from('ai_conversations').update({ title: titleInput }).eq('id', id)
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: titleInput } : c))
    } else {
      setDemoConvs(prev => prev.map(c => c.id === id ? { ...c, title: titleInput } : c))
    }
    setEditingTitle(null)
  }

  const sendMessage = async () => {
    if (!input.trim() || streaming) return

    if (demoMode) {
      if (!demoActiveId) return
      const userMsg = { role: 'user' as const, content: input }
      setDemoConvs(prev => prev.map(c =>
        c.id === demoActiveId ? { ...c, messages: [...c.messages, userMsg] } : c
      ))
      setInput('')
      setStreaming(true)

      const currentConv = demoConvs.find(c => c.id === demoActiveId)
      const allMessages = [...(currentConv?.messages ?? []), userMsg]

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formationId,
            conversationId: 'demo',
            userMessage: input,
            demoMessages: allMessages,
            courseContext,
          }),
        })
        if (res.body) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let text = ''
          setDemoConvs(prev => prev.map(c =>
            c.id === demoActiveId ? { ...c, messages: [...c.messages, { role: 'assistant', content: '' }] } : c
          ))
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            text += decoder.decode(value, { stream: true })
            setDemoConvs(prev => prev.map(c => {
              if (c.id !== demoActiveId) return c
              const msgs = [...c.messages]
              msgs[msgs.length - 1] = { role: 'assistant', content: text }
              return { ...c, messages: msgs }
            }))
          }
        }
      } catch { /* ignore */ }
      setStreaming(false)
      return
    }

    if (!activeConvId) return
    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      conversation_id: activeConvId,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formationId,
          conversationId: activeConvId,
          userMessage: input,
          courseContext,
        }),
      })
      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let text = ''
        const assistantMsg: AiMessage = {
          id: crypto.randomUUID(),
          conversation_id: activeConvId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...assistantMsg, content: text }
            return updated
          })
        }
      }
    } catch { /* ignore */ }
    setStreaming(false)
  }

  // Determine what to render
  const convList = demoMode ? demoConvs : conversations
  const activeId = demoMode ? demoActiveId : activeConvId
  const activeMessages = demoMode
    ? (demoConvs.find(c => c.id === demoActiveId)?.messages ?? [])
    : messages

  const innerContent = (
    <div className="flex h-full">
      {/* Conversations sidebar */}
      <div className="w-48 border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-3 py-2.5 border-b border-gray-100 flex gap-1.5">
          <button
            onClick={createConversation}
            className="flex-1 flex items-center gap-1.5 bg-ocean text-white text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-ocean-light transition"
          >
            <Plus size={12} /> Nouvelle
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="border border-gray-200 text-gray-500 hover:text-ocean hover:border-ocean p-1.5 rounded-lg transition"
            title={isFullscreen ? 'Réduire' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {convList.length === 0 && (
            <p className="text-xs text-gray-400 text-center px-3 py-4">Aucune discussion</p>
          )}
          {convList.map(c => (
            <div
              key={c.id}
              className={`group flex items-center px-2.5 py-2 cursor-pointer rounded-lg mx-1 mb-0.5 transition ${
                activeId === c.id ? 'bg-ocean/10' : 'hover:bg-gray-50'
              }`}
              onClick={() => demoMode ? setDemoActiveId(c.id) : (setActiveConvId(c.id), setMessages([]))}
            >
              <MessageSquare size={11} className="text-gray-400 shrink-0 mr-1.5" />
              {editingTitle === c.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    autoFocus
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveTitle(c.id)}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 text-xs border border-ocean rounded px-1 outline-none"
                  />
                  <button onClick={e => { e.stopPropagation(); saveTitle(c.id) }} className="text-green-500">
                    <Check size={11} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs text-gray-700 truncate flex-1 min-w-0">{c.title}</span>
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingTitle(c.id); setTitleInput(c.title) }}
                      className="text-gray-300 hover:text-ocean"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteConversation(c.id) }}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-sm text-gray-400 mb-3">Sélectionnez une discussion ou créez-en une nouvelle</p>
              <button
                onClick={createConversation}
                className="flex items-center gap-1.5 bg-ocean text-white text-sm px-4 py-2 rounded-xl hover:bg-ocean-light transition mx-auto"
              >
                <Plus size={14} /> Nouvelle discussion
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {loadingMsgs && (
                <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
              )}
              {activeMessages.length === 0 && !loadingMsgs && (
                <p className="text-xs text-gray-400 text-center py-8">
                  Commencez la discussion. Je connais votre formation et sa base de connaissances.
                </p>
              )}
              {activeMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' ? 'bg-ocean text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.content || <span className="animate-pulse opacity-50">...</span>}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-gray-100 px-3 py-2.5">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder="Votre message... (Entrée pour envoyer)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-ocean resize-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={streaming || !input.trim()}
                  className="bg-ocean text-white px-3 rounded-xl hover:bg-ocean-light transition disabled:opacity-50 flex items-center"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="bg-ocean text-white px-5 py-3 flex items-center justify-between shrink-0">
          <span className="font-semibold text-sm">Assistant IA — Plein écran</span>
          <button onClick={() => setIsFullscreen(false)} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition">
            <Minimize2 size={15} /> Réduire
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {innerContent}
        </div>
      </div>
    )
  }

  return innerContent
}

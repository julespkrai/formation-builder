'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { estimateDuration } from '@/lib/utils'
import { ChevronLeft, Maximize2, Minimize2, Wand2, X, Save, FileText, Link as LinkIcon, BookOpen, Plus, Trash2 } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
import AiChatPanel from '@/components/AiChatPanel'
import type { Resource } from '@/lib/types'

type Props = {
  course: {
    id: string
    module_id: string
    title: string
    intro: string | null
    teleprompter_text: string | null
    estimated_seconds: number | null
    order: number
  }
  module_: { id: string; formation_id: string; title: string }
  formation: { id: string; title: string; objectives: string | null; target_audience: string | null }
  resources?: Resource[]
  demoMode?: boolean
}

type Panel = 'ai' | 'resources' | null

export default function CourseEditor({ course, module_, formation, resources: initialResources = [], demoMode }: Props) {
  const supabase = createClient()
  const [title, setTitle] = useState(course.title)
  const [intro, setIntro] = useState(course.intro ?? '')
  const [text, setText] = useState(course.teleprompter_text ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [readMode, setReadMode] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)

  // Resources state
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [newRes, setNewRes] = useState({ title: '', type: 'link' as Resource['type'], content: '' })
  const [resSaving, setResSaving] = useState(false)

  const duration = estimateDuration(text)
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  const save = useCallback(async (t: string, i: string, ti: string) => {
    if (demoMode) return
    setSaving(true)
    const dur = estimateDuration(t)
    await supabase.from('courses').update({
      title: ti,
      intro: i,
      teleprompter_text: t,
      estimated_seconds: dur.seconds,
    }).eq('id', course.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }, [course.id, demoMode, supabase])

  // Auto-save debounce (2s)
  useEffect(() => {
    if (demoMode) return
    const timeout = setTimeout(() => save(text, intro, title), 2000)
    return () => clearTimeout(timeout)
  }, [text, intro, title, save, demoMode])

  // Resources
  const addResource = async () => {
    if (demoMode || !newRes.title.trim() || !newRes.content.trim()) return
    setResSaving(true)
    const { data } = await supabase.from('resources').insert({
      course_id: course.id,
      formation_id: module_.formation_id,
      title: newRes.title,
      type: newRes.type,
      content: newRes.content,
    }).select().single()
    if (data) setResources(prev => [...prev, data as Resource])
    setNewRes({ title: '', type: 'link', content: '' })
    setResSaving(false)
  }

  const deleteResource = async (id: string) => {
    if (demoMode) return
    await supabase.from('resources').delete().eq('id', id)
    setResources(prev => prev.filter(r => r.id !== id))
  }

  const togglePanel = (p: Panel) => setPanel(prev => prev === p ? null : p)

  const resIcon = (type: string) => {
    if (type === 'link') return <LinkIcon size={13} />
    if (type === 'pdf') return <FileText size={13} />
    return <BookOpen size={13} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-ocean text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href={`/formations/${formation.id}?tab=modules`} className="text-white/60 hover:text-white transition flex items-center gap-1 shrink-0">
            <ChevronLeft size={15} /> {formation.title}
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white/60 shrink-0">{module_.title}</span>
          <span className="text-white/30">/</span>
          <span className="truncate">{title}</span>
          {demoMode && <span className="text-xs bg-sun text-ocean px-2 py-0.5 rounded-full font-medium shrink-0 ml-1">Démo</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => save(text, intro, title)}
            disabled={saving || demoMode}
            className="flex items-center gap-1.5 bg-sun text-ocean text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-yellow-200 transition disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
          <LogoutButton isDemoMode={demoMode} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main editor */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-gray-900">{wordCount}</span>
                <span className="text-gray-400">mots</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-ocean">{duration.display}</span>
                <span className="text-gray-400">estimée</span>
              </div>
              {!demoMode && (
                <div className="text-xs text-gray-400">
                  {saving ? '● Enregistrement...' : saved ? '● Enregistré' : '● Auto-save 2s'}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  togglePanel('ai')
                  // Auto-create conversation will happen inside AiChatPanel
                }}
                className="flex items-center gap-1.5 bg-sun text-ocean text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition"
              >
                <Wand2 size={14} /> IA
              </button>
              <button
                onClick={() => togglePanel('resources')}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${
                  panel === 'resources' ? 'bg-ocean text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText size={14} /> Ressources
                {resources.length > 0 && (
                  <span className="bg-ocean/20 text-ocean text-xs px-1.5 py-0.5 rounded-full font-medium ml-0.5">
                    {resources.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setReadMode(r => !r)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {readMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {readMode ? 'Éditer' : 'Lecture'}
              </button>
            </div>
          </div>

          {/* Editor */}
          {readMode ? (
            <div className="flex-1 overflow-y-auto bg-gray-900 px-12 py-16">
              <div className="max-w-3xl mx-auto text-white text-3xl leading-relaxed font-medium tracking-wide whitespace-pre-wrap">
                {text || <span className="text-white/30 text-xl">Aucun texte...</span>}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Titre du cours</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full text-xl font-semibold text-gray-900 border-0 outline-none bg-transparent border-b border-gray-100 pb-2 focus:border-ocean transition" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Introduction / chapeau</label>
                <textarea rows={2} value={intro} onChange={e => setIntro(e.target.value)}
                  placeholder="Décrivez brièvement le contenu de ce cours..."
                  className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-ocean resize-none bg-white" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Texte prompteur <span className="text-gray-300 normal-case">(130 mots/min)</span>
                  </label>
                  <button
                    onClick={() => save(text, intro, title)}
                    disabled={saving || demoMode}
                    className="flex items-center gap-1 text-xs text-ocean hover:text-ocean-light transition disabled:opacity-50"
                  >
                    <Save size={11} /> Sauvegarder maintenant
                  </button>
                </div>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Rédigez votre texte de prompteur ici. Parlez comme si vous parliez directement à votre caméra..."
                  className="w-full min-h-96 border border-gray-100 rounded-xl px-4 py-4 text-base text-gray-800 leading-relaxed outline-none focus:border-ocean resize-none bg-white" />
              </div>
            </div>
          )}
        </main>

        {/* AI Panel */}
        {panel === 'ai' && (
          <aside className="w-96 border-l border-gray-100 bg-white flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Assistant IA</p>
                <p className="text-xs text-gray-400">Base de connaissances active</p>
              </div>
              <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AiChatPanel
                formationId={formation.id}
                courseId={course.id}
                courseContext={{ title, intro }}
                demoMode={demoMode}
              />
            </div>
          </aside>
        )}

        {/* Resources Panel */}
        {panel === 'resources' && (
          <aside className="w-80 border-l border-gray-100 bg-white flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Ressources du cours</p>
              <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {resources.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Aucune ressource pour ce cours.</p>
              )}
              {resources.map(r => (
                <div key={r.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start gap-2 group">
                  <span className="text-gray-400 mt-0.5">{resIcon(r.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{r.title}</p>
                    {r.content && r.type === 'link' && (
                      <a href={r.content} target="_blank" rel="noopener noreferrer" className="text-xs text-ocean hover:underline truncate block">{r.content}</a>
                    )}
                    {r.content && r.type === 'text' && <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{r.content}</p>}
                  </div>
                  <button onClick={() => deleteResource(r.id)} disabled={demoMode}
                    className="text-gray-300 hover:text-red-400 transition disabled:opacity-40 opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 px-3 py-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">Ajouter une ressource</p>
              <input type="text" placeholder="Titre..." value={newRes.title} onChange={e => setNewRes(r => ({ ...r, title: e.target.value }))} disabled={demoMode}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-ocean disabled:opacity-50" />
              <div className="flex gap-1.5">
                <select value={newRes.type} onChange={e => setNewRes(r => ({ ...r, type: e.target.value as Resource['type'] }))} disabled={demoMode}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-ocean disabled:opacity-50">
                  <option value="link">Lien</option>
                  <option value="text">Texte</option>
                  <option value="pdf">PDF</option>
                </select>
                <input type="text" placeholder={newRes.type === 'link' ? 'https://...' : 'Contenu...'} value={newRes.content}
                  onChange={e => setNewRes(r => ({ ...r, content: e.target.value }))} disabled={demoMode}
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-ocean disabled:opacity-50" />
              </div>
              <button onClick={addResource} disabled={demoMode || resSaving || !newRes.title || !newRes.content}
                className="w-full flex items-center justify-center gap-1.5 bg-ocean text-white text-xs font-medium py-1.5 rounded-lg hover:bg-ocean-light transition disabled:opacity-50">
                <Plus size={11} /> Ajouter la ressource
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

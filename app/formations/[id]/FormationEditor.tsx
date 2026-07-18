'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { ChevronLeft, Plus, Trash2, ExternalLink, BookOpen, FileText, Link as LinkIcon, Save, ClipboardList } from 'lucide-react'
import type { Formation, ModuleWithCourses, Resource, KnowledgeBase, FormationStatus, FormationStyle } from '@/lib/types'
import LogoutButton from '@/components/LogoutButton'
import AiChatPanel from '@/components/AiChatPanel'

type Tab = 'plan' | 'modules' | 'ressources' | 'ia' | 'style'

type Props = {
  formation: Formation
  modules: ModuleWithCourses[]
  resources: Resource[]
  knowledgeBase: KnowledgeBase[]
  demoMode?: boolean
}

export default function FormationEditor({ formation, modules, resources, knowledgeBase, demoMode }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab) || 'plan'
  const setActiveTab = (t: Tab) => router.replace(`?tab=${t}`, { scroll: false })

  // Plan state
  const [plan, setPlan] = useState({
    title: formation.title,
    status: formation.status as FormationStatus,
    description: formation.description ?? '',
    objectives: formation.objectives ?? '',
    target_audience: formation.target_audience ?? '',
  })
  const [planSaving, setPlanSaving] = useState(false)
  const [planSaved, setPlanSaved] = useState(false)

  // Style state
  const [style, setStyle] = useState<FormationStyle>(formation.style ?? {})
  const [styleSaving, setStyleSaving] = useState(false)
  const [styleSaved, setStyleSaved] = useState(false)

  // Modules
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newCourseTitles, setNewCourseTitles] = useState<Record<string, string>>({})

  // Resources
  const [newRes, setNewRes] = useState({ title: '', type: 'link' as Resource['type'], content: '', course_id: '' })

  // Knowledge base
  const [kbText, setKbText] = useState({ title: '', content: '' })
  const [kbFile, setKbFile] = useState<File | null>(null)
  const [kbFileTitle, setKbFileTitle] = useState('')
  const [kbUploading, setKbUploading] = useState(false)

  const refresh = () => router.refresh()
  const planMounted = useRef(false)
  const styleMounted = useRef(false)

  // --- Plan autosave ---
  const savePlan = async (p = plan) => {
    if (demoMode) return
    setPlanSaving(true)
    await supabase.from('formations').update(p).eq('id', formation.id)
    setPlanSaving(false)
    setPlanSaved(true)
    setTimeout(() => setPlanSaved(false), 2000)
  }

  useEffect(() => {
    if (!planMounted.current) { planMounted.current = true; return }
    if (demoMode) return
    const t = setTimeout(() => savePlan(plan), 2000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.title, plan.status, plan.description, plan.objectives, plan.target_audience])

  // --- Style autosave ---
  const saveStyle = async (s = style) => {
    if (demoMode) return
    setStyleSaving(true)
    await supabase.from('formations').update({ style: s }).eq('id', formation.id)
    setStyleSaving(false)
    setStyleSaved(true)
    setTimeout(() => setStyleSaved(false), 2000)
  }

  useEffect(() => {
    if (!styleMounted.current) { styleMounted.current = true; return }
    if (demoMode) return
    const t = setTimeout(() => saveStyle(style), 2000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.tone, style.expressions, style.examples])

  // --- Modules ---
  const addModule = async () => {
    if (!newModuleTitle.trim() || demoMode) return
    const maxOrder = modules.reduce((max, m) => Math.max(max, m.order), -1)
    await supabase.from('modules').insert({ formation_id: formation.id, title: newModuleTitle.trim(), order: maxOrder + 1 })
    setNewModuleTitle('')
    refresh()
  }

  const deleteModule = async (id: string) => {
    if (demoMode || !confirm('Supprimer ce module et tous ses cours ?')) return
    await supabase.from('modules').delete().eq('id', id)
    refresh()
  }

  const addCourse = async (moduleId: string) => {
    if (demoMode) return
    const title = newCourseTitles[moduleId]?.trim()
    if (!title) return
    const mod = modules.find(m => m.id === moduleId)
    const maxOrder = (mod?.courses ?? []).reduce((max, c) => Math.max(max, c.order), -1)
    await supabase.from('courses').insert({ module_id: moduleId, title, order: maxOrder + 1 })
    setNewCourseTitles(prev => ({ ...prev, [moduleId]: '' }))
    refresh()
  }

  const deleteCourse = async (courseId: string) => {
    if (demoMode || !confirm('Supprimer ce cours ?')) return
    await supabase.from('courses').delete().eq('id', courseId)
    refresh()
  }

  // --- Resources ---
  const addResource = async () => {
    if (demoMode || !newRes.title.trim() || !newRes.content.trim()) return
    await supabase.from('resources').insert({
      title: newRes.title,
      type: newRes.type,
      content: newRes.content,
      formation_id: formation.id,
      course_id: newRes.course_id || null,
    })
    setNewRes({ title: '', type: 'link', content: '', course_id: '' })
    refresh()
  }

  const deleteResource = async (id: string) => {
    if (demoMode) return
    await supabase.from('resources').delete().eq('id', id)
    refresh()
  }

  // --- Knowledge base ---
  const addKbText = async () => {
    if (demoMode || !kbText.title.trim() || !kbText.content.trim()) return
    await supabase.from('knowledge_base').insert({ formation_id: formation.id, title: kbText.title, type: 'text', raw_content: kbText.content })
    setKbText({ title: '', content: '' })
    refresh()
  }

  const uploadKbPdf = async () => {
    if (demoMode || !kbFile || !kbFileTitle.trim()) return
    setKbUploading(true)
    const fd = new FormData()
    fd.append('file', kbFile)
    fd.append('formationId', formation.id)
    fd.append('title', kbFileTitle)
    const res = await fetch('/api/knowledge-base', { method: 'POST', body: fd })
    if (res.ok) { setKbFile(null); setKbFileTitle(''); refresh() }
    setKbUploading(false)
  }

  const deleteKb = async (id: string) => {
    if (demoMode) return
    await supabase.from('knowledge_base').delete().eq('id', id)
    refresh()
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
      activeTab === t ? 'bg-ocean text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
    }`

  const resIcon = (type: string) => {
    if (type === 'link') return <LinkIcon size={14} />
    if (type === 'pdf') return <FileText size={14} />
    return <BookOpen size={14} />
  }

  const SaveBar = ({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) => (
    <div className="flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={saving || demoMode}
        title={demoMode ? 'Mode démo — connectez Supabase pour sauvegarder' : undefined}
        className="flex items-center gap-1.5 bg-ocean text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-ocean-light transition disabled:opacity-60"
      >
        <Save size={14} />
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
      {saved && <span className="text-green-600 text-sm font-medium">Enregistré ✓</span>}
      {demoMode && <span className="text-gray-400 text-xs">Mode démo</span>}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-ocean text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/formations" className="flex items-center gap-1 text-white/60 hover:text-white text-sm transition">
            <ChevronLeft size={16} /> Mes formations
          </Link>
          <span className="text-white/30">/</span>
          <span className="font-medium text-sm truncate max-w-xs">{plan.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[plan.status]}`}>
            {STATUS_LABELS[plan.status]}
          </span>
          {demoMode && <span className="text-xs bg-sun text-ocean px-2 py-0.5 rounded-full font-medium">Démo</span>}
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'plan' && (
            <button onClick={() => savePlan()} disabled={planSaving || demoMode}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-50">
              <Save size={13} /> {planSaving ? '...' : planSaved ? 'Enregistré ✓' : 'Enregistrer'}
            </button>
          )}
          {activeTab === 'style' && (
            <button onClick={() => saveStyle()} disabled={styleSaving || demoMode}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-50">
              <Save size={13} /> {styleSaving ? '...' : styleSaved ? 'Enregistré ✓' : 'Enregistrer le style'}
            </button>
          )}
          <LogoutButton isDemoMode={demoMode} />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex gap-1">
        {(['plan', 'modules', 'ressources', 'ia', 'style'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={tabClass(t)}>
            {t === 'plan' ? 'Plan'
              : t === 'modules' ? 'Modules'
              : t === 'ressources' ? 'Ressources'
              : t === 'ia' ? 'IA'
              : 'Mon style'}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">

        {/* ===== TAB PLAN ===== */}
        {activeTab === 'plan' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Informations générales</h2>
              <SaveBar onSave={savePlan} saving={planSaving} saved={planSaved} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input type="text" value={plan.title} onChange={e => setPlan(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select value={plan.status} onChange={e => setPlan(p => ({ ...p, status: e.target.value as FormationStatus }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} value={plan.description} onChange={e => setPlan(p => ({ ...p, description: e.target.value }))}
                placeholder="Décrivez votre formation..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs pédagogiques</label>
              <textarea rows={4} value={plan.objectives} onChange={e => setPlan(p => ({ ...p, objectives: e.target.value }))}
                placeholder="À la fin de cette formation, l'apprenant sera capable de..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Public cible</label>
              <textarea rows={2} value={plan.target_audience} onChange={e => setPlan(p => ({ ...p, target_audience: e.target.value }))}
                placeholder="Qui est votre public cible ?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10 resize-none" />
            </div>

            <SaveBar onSave={savePlan} saving={planSaving} saved={planSaved} />
          </div>
        )}

        {/* ===== TAB MODULES ===== */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            {modules.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
                Aucun module. Ajoutez-en un ci-dessous.
              </div>
            )}

            {modules.map((mod, idx) => (
              <div key={mod.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Module {idx + 1}</span>
                    <span className="font-semibold text-gray-900">{mod.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/formations/${formation.id}/modules/${mod.id}/quiz`}
                      className="flex items-center gap-1 text-xs bg-lilac/50 text-indigo-600 hover:bg-lilac px-2.5 py-1 rounded-lg transition font-medium"
                    >
                      <ClipboardList size={12} /> Quiz
                    </Link>
                    <button onClick={() => deleteModule(mod.id)} disabled={demoMode} className="text-gray-300 hover:text-red-500 transition disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="px-5 py-3 space-y-1.5">
                  {mod.courses.length === 0 && (
                    <p className="text-xs text-gray-400 py-1">Aucun cours dans ce module.</p>
                  )}
                  {mod.courses.map((course, ci) => (
                    <div key={course.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 w-5 text-right">{ci + 1}.</span>
                        <span className="text-sm text-gray-700">{course.title}</span>
                        {course.estimated_seconds != null && course.estimated_seconds > 0 && (
                          <span className="text-xs text-gray-300">
                            {Math.floor(course.estimated_seconds / 60)}m{course.estimated_seconds % 60 > 0 ? `${course.estimated_seconds % 60}s` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/formations/${formation.id}/modules/${mod.id}/courses/${course.id}`}
                          className="text-xs text-ocean hover:underline flex items-center gap-1"
                        >
                          Éditer <ExternalLink size={11} />
                        </Link>
                        <button onClick={() => deleteCourse(course.id)} disabled={demoMode} className="text-gray-300 hover:text-red-500 transition disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <input type="text" placeholder="Titre du cours..." value={newCourseTitles[mod.id] ?? ''}
                      onChange={e => setNewCourseTitles(prev => ({ ...prev, [mod.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addCourse(mod.id)}
                      disabled={demoMode}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-ocean disabled:opacity-50" />
                    <button onClick={() => addCourse(mod.id)} disabled={demoMode}
                      className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs transition disabled:opacity-40">
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-4 flex gap-2">
              <input type="text" placeholder="Titre du nouveau module..." value={newModuleTitle}
                onChange={e => setNewModuleTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addModule()}
                disabled={demoMode}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean disabled:opacity-50" />
              <button onClick={addModule} disabled={demoMode}
                className="flex items-center gap-1.5 bg-ocean text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-ocean-light transition disabled:opacity-50">
                <Plus size={14} /> Module
              </button>
            </div>
          </div>
        )}

        {/* ===== TAB RESSOURCES ===== */}
        {activeTab === 'ressources' && (
          <div className="space-y-4">
            {resources.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
                Aucune ressource partagée.
              </div>
            )}
            {resources.map(r => {
              const linkedCourse = r.course_id
                ? modules.flatMap(m => m.courses).find(c => c.id === r.course_id)
                : null
              const linkedModule = linkedCourse
                ? modules.find(m => m.courses.some(c => c.id === r.course_id))
                : null
              return (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-400">{resIcon(r.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
                      {linkedCourse ? (
                        <p className="text-xs text-ocean/70 mt-0.5">
                          {linkedModule?.title} — {linkedCourse.title}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Formation complète</p>
                      )}
                      {r.content && r.type === 'link' && (
                        <a href={r.content} target="_blank" rel="noopener noreferrer" className="text-xs text-ocean hover:underline truncate max-w-xs block">{r.content}</a>
                      )}
                      {r.content && r.type === 'text' && <p className="text-xs text-gray-400 line-clamp-2">{r.content}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteResource(r.id)} disabled={demoMode} className="text-gray-300 hover:text-red-500 transition disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}

            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Ajouter une ressource</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Titre..." value={newRes.title} onChange={e => setNewRes(r => ({ ...r, title: e.target.value }))} disabled={demoMode}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean disabled:opacity-50" />
                <select value={newRes.type} onChange={e => setNewRes(r => ({ ...r, type: e.target.value as Resource['type'] }))} disabled={demoMode}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean disabled:opacity-50">
                  <option value="link">Lien</option>
                  <option value="text">Texte</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <select
                value={newRes.course_id}
                onChange={e => setNewRes(r => ({ ...r, course_id: e.target.value }))}
                disabled={demoMode}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean disabled:opacity-50"
              >
                <option value="">Formation complète (pas de cours spécifique)</option>
                {modules.map(m => (
                  <optgroup key={m.id} label={m.title}>
                    {m.courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <textarea rows={2} placeholder={newRes.type === 'link' ? 'https://...' : 'Contenu...'} value={newRes.content}
                onChange={e => setNewRes(r => ({ ...r, content: e.target.value }))} disabled={demoMode}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean resize-none disabled:opacity-50" />
              <button onClick={addResource} disabled={demoMode}
                className="bg-ocean text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-ocean-light transition disabled:opacity-50">
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* ===== TAB IA ===== */}
        {activeTab === 'ia' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Knowledge base - left */}
            <div className="lg:col-span-2 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">Base de connaissances</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ces documents sont injectés dans le contexte de Claude pour toute la formation, y compris dans l'éditeur de cours.</p>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {knowledgeBase.length === 0 && <p className="text-sm text-gray-400 py-2">Aucun document.</p>}
                {knowledgeBase.map(kb => (
                  <div key={kb.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{kb.type === 'pdf' ? <FileText size={13} /> : <BookOpen size={13} />}</span>
                      <span className="text-sm text-gray-700 truncate max-w-[160px]">{kb.title}</span>
                      <span className="text-xs text-gray-300 uppercase">{kb.type}</span>
                    </div>
                    <button onClick={() => deleteKb(kb.id)} disabled={demoMode} className="text-gray-300 hover:text-red-500 transition disabled:opacity-40">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-medium text-gray-600">Ajouter un texte</p>
                <input type="text" placeholder="Titre..." value={kbText.title} onChange={e => setKbText(k => ({ ...k, title: e.target.value }))} disabled={demoMode}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-ocean disabled:opacity-50" />
                <textarea rows={3} placeholder="Notes de cours, résumé de livre, définitions..."
                  value={kbText.content} onChange={e => setKbText(k => ({ ...k, content: e.target.value }))} disabled={demoMode}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-ocean resize-none disabled:opacity-50" />
                <button onClick={addKbText} disabled={demoMode} className="bg-ocean text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-ocean-light transition disabled:opacity-50">
                  Ajouter
                </button>
              </div>

              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-medium text-gray-600">Uploader un PDF</p>
                <input type="text" placeholder="Titre du document..." value={kbFileTitle} onChange={e => setKbFileTitle(e.target.value)} disabled={demoMode}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-ocean disabled:opacity-50" />
                <input type="file" accept=".pdf" onChange={e => setKbFile(e.target.files?.[0] ?? null)} disabled={demoMode} className="text-xs text-gray-500" />
                <button onClick={uploadKbPdf} disabled={!kbFile || !kbFileTitle || kbUploading || demoMode}
                  className="bg-ocean text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-ocean-light transition disabled:opacity-50">
                  {kbUploading ? 'Upload...' : 'Uploader'}
                </button>
              </div>
            </div>

            {/* Multi-conversations - right */}
            <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ height: 560 }}>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Discussions IA</p>
                <p className="text-xs text-gray-400">Conversations liées à cette formation</p>
              </div>
              <div className="h-full" style={{ height: 'calc(100% - 57px)' }}>
                <AiChatPanel
                  formationId={formation.id}
                  demoMode={demoMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB STYLE ===== */}
        {activeTab === 'style' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Mon style d'expression</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Ces paramètres sont injectés dans Claude pour que l'IA écrive <strong>avec votre voix</strong>, pas avec la sienne.
                </p>
              </div>
              <SaveBar onSave={saveStyle} saving={styleSaving} saved={styleSaved} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tonalité et style global</label>
              <input type="text" value={style.tone ?? ''}
                onChange={e => setStyle(s => ({ ...s, tone: e.target.value }))}
                placeholder="Ex : décontracté, direct, parle comme un coach, utilise parfois le créole réunionnais, tutoie..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10" />
              <p className="text-xs text-gray-400 mt-1">Décrivez votre façon de parler et d'écrire en quelques mots clés.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expressions et mots que j'utilise souvent</label>
              <textarea rows={4} value={style.expressions ?? ''}
                onChange={e => setStyle(s => ({ ...s, expressions: e.target.value }))}
                placeholder="Ex : je dis souvent 'concrètement', 'ok donc', 'voilà ce que ça donne', j'évite le jargon trop technique, j'utilise beaucoup de métaphores..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exemples de mon écriture / mes textes</label>
              <p className="text-xs text-gray-400 mb-2">
                Collez ici des extraits de vos propres textes (mails, articles, scripts vidéo...). Claude va imiter ce style pour générer vos textes prompteur.
              </p>
              <textarea rows={10} value={style.examples ?? ''}
                onChange={e => setStyle(s => ({ ...s, examples: e.target.value }))}
                placeholder="Collez ici des exemples de votre façon d'écrire ou de parler..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/10 resize-none font-mono" />
              <p className="text-xs text-gray-400 mt-1">Plus vous donnez d'exemples, mieux Claude reproduit votre style.</p>
            </div>

            <SaveBar onSave={saveStyle} saving={styleSaving} saved={styleSaved} />
          </div>
        )}
      </main>
    </div>
  )
}

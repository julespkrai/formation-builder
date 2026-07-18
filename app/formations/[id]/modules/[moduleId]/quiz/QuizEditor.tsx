'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Plus, Trash2, Check, Save } from 'lucide-react'
import type { Quiz, QuizQuestion } from '@/lib/types'
import LogoutButton from '@/components/LogoutButton'

const newQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  question: '',
  options: ['', '', '', ''],
  correct_index: 0,
  explanation: '',
})

type Props = {
  formationId: string
  moduleId: string
  moduleTitle: string
  quiz: Quiz | null
  demoMode?: boolean
}

export default function QuizEditor({ formationId, moduleId, moduleTitle, quiz, demoMode }: Props) {
  const supabase = createClient()
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const quizMounted = useRef(false)

  const save = useCallback(async (qs: QuizQuestion[]) => {
    if (demoMode) return
    setSaving(true)
    if (quiz) {
      await supabase.from('quizzes').update({ questions: qs }).eq('id', quiz.id)
    } else {
      await supabase.from('quizzes').insert({ module_id: moduleId, questions: qs })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [demoMode, quiz, moduleId, supabase])

  // Autosave 2s debounce
  useEffect(() => {
    if (!quizMounted.current) { quizMounted.current = true; return }
    const t = setTimeout(() => save(questions), 2000)
    return () => clearTimeout(t)
  }, [questions, save])

  const addQuestion = () => {
    setQuestions(q => [...q, newQuestion()])
  }

  const updateQuestion = (idx: number, update: Partial<QuizQuestion>) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...update } : q))
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q
      const options = [...q.options] as QuizQuestion['options']
      options[oIdx] = value
      return { ...q, options }
    }))
  }

  const deleteQuestion = (idx: number) => {
    setQuestions(qs => qs.filter((_, i) => i !== idx))
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-ocean text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/formations/${formationId}?tab=modules`} className="text-white/60 hover:text-white transition flex items-center gap-1">
            <ChevronLeft size={15} /> Modules
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white/70">{moduleTitle}</span>
          <span className="text-white/30">/</span>
          <span>Quiz</span>
          {demoMode && <span className="text-xs bg-sun text-ocean px-2 py-0.5 rounded-full font-medium ml-1">Démo</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => save(questions)}
            disabled={saving || demoMode}
            className="flex items-center gap-1.5 bg-sun text-ocean text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-yellow-200 transition disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
          <LogoutButton isDemoMode={demoMode} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quiz — {moduleTitle}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 bg-ocean text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-ocean-light transition"
          >
            <Plus size={15} /> Ajouter une question
          </button>
        </div>

        {questions.length === 0 && (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-400 mb-4">Aucune question. Commencez par en ajouter une.</p>
            <button
              onClick={addQuestion}
              className="flex items-center gap-1.5 bg-ocean text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-ocean-light transition mx-auto"
            >
              <Plus size={15} /> Ajouter une question
            </button>
          </div>
        )}

        <div className="space-y-5">
          {questions.map((q, qIdx) => (
            <div key={q.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="bg-gray-50/80 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Question {qIdx + 1}</span>
                <button onClick={() => deleteQuestion(qIdx)} className="text-gray-300 hover:text-red-500 transition">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Question</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={e => updateQuestion(qIdx, { question: e.target.value })}
                    placeholder="Rédigez votre question..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Réponses <span className="text-gray-300 normal-case">(cliquez sur la bonne)</span>
                  </label>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuestion(qIdx, { correct_index: oIdx as 0|1|2|3 })}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            q.correct_index === oIdx
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-200 hover:border-green-300'
                          }`}
                        >
                          {q.correct_index === oIdx && <Check size={12} className="text-white" />}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`Réponse ${String.fromCharCode(65 + oIdx)}...`}
                          className={`flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none transition ${
                            q.correct_index === oIdx
                              ? 'border-green-200 bg-green-50 focus:border-green-400'
                              : 'border-gray-200 focus:border-ocean'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Explication <span className="text-gray-300 normal-case">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={e => updateQuestion(qIdx, { explanation: e.target.value })}
                    placeholder="Pourquoi cette réponse est-elle correcte ?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-ocean"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {questions.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => save(questions)}
              disabled={saving || demoMode}
              className="flex items-center gap-2 bg-ocean text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-ocean-light transition disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer le quiz'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

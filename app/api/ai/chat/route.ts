import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const demoAuth = cookieStore.get('demo_auth')?.value === 'true'

  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

  if (!user && !demoAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    conversationId,
    formationId,
    userMessage,
    demoMessages, // used in demo mode
    courseContext,
  } = await request.json()

  if (!formationId || !userMessage) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (typeof userMessage !== 'string' || userMessage.length > 10000) {
    return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
  }

  // Verify formation ownership (production only — RLS already enforces but explicit check is cleaner)
  if (user) {
    const { data: owned } = await supabase.from('formations').select('id').eq('id', formationId).eq('user_id', user.id).single()
    if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Save user message (production only)
  if (user && conversationId && conversationId !== 'demo') {
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
    })
  }

  // Load conversation history
  let history: { role: 'user' | 'assistant'; content: string }[] = []
  if (demoMessages) {
    // Demo mode: use messages from client
    history = demoMessages
  } else if (user && conversationId && conversationId !== 'demo') {
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(30)
    history = (data ?? []) as { role: 'user' | 'assistant'; content: string }[]
  } else {
    history = [{ role: 'user', content: userMessage }]
  }

  // Load formation context
  const [{ data: formation }, { data: modules }, { data: knowledgeBase }] = await Promise.all([
    supabase.from('formations').select('title, objectives, target_audience, style').eq('id', formationId).single(),
    supabase.from('modules').select('id, title, order').eq('formation_id', formationId).order('order'),
    supabase.from('knowledge_base').select('title, type, raw_content').eq('formation_id', formationId),
  ])

  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: courses } = moduleIds.length
    ? await supabase.from('courses').select('module_id, title, intro, order').in('module_id', moduleIds).order('order')
    : { data: [] }

  const modulesContext = (modules ?? [])
    .map(m => {
      const mc = (courses ?? []).filter(c => c.module_id === m.id)
      return `Module ${m.order + 1}: ${m.title}\n${mc.map(c => `  - ${c.title}${c.intro ? ` : ${c.intro}` : ''}`).join('\n')}`
    })
    .join('\n\n')

  const kbContext = (knowledgeBase ?? [])
    .filter(kb => kb.raw_content)
    .map(kb => `[${kb.title}]\n${kb.raw_content!.slice(0, 50000)}`)
    .join('\n\n---\n\n')

  const courseCtx = courseContext
    ? `\nCONTEXTE DU COURS EN COURS D'ÉDITION :\nTitre : ${courseContext.title}\nIntro : ${courseContext.intro || 'non précisée'}\n`
    : ''

  // Style personnel
  const style = (formation as any)?.style ?? {}
  const styleCtx = [
    style.tone && `TONALITÉ ET STYLE D'ÉCRITURE : ${style.tone}`,
    style.expressions && `EXPRESSIONS ET VOCABULAIRE À UTILISER : ${style.expressions}`,
    style.examples && `EXEMPLES DE MON ÉCRITURE (imite ce style pour les textes prompteur) :\n${style.examples}`,
  ].filter(Boolean).join('\n\n')

  const systemPrompt = `Tu es un assistant pédagogique expert qui aide à créer la formation "${formation?.title ?? ''}".

INFORMATIONS SUR LA FORMATION :
Objectifs : ${formation?.objectives ?? 'non précisés'}
Public cible : ${formation?.target_audience ?? 'non précisé'}
${courseCtx}
STRUCTURE DE LA FORMATION :
${modulesContext || 'Aucun module créé.'}

${kbContext ? `BASE DE CONNAISSANCES (documents uploadés) :\n${kbContext}` : ''}

${styleCtx ? `STYLE PERSONNEL DE L'AUTEUR :\n${styleCtx}` : ''}

INSTRUCTIONS :
- Pour les textes prompteur : style oral, naturel, sans markdown, comme si tu parlais à la caméra
- Respecte le style et le vocabulaire de l'auteur si précisé
- Réponds toujours en français
- Tu peux générer des questions de quiz, des structures de modules, des exercices pratiques`

  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: history.map(m => ({ role: m.role, content: m.content })),
  })

  let assistantText = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          assistantText += chunk.delta.text
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      controller.close()

      // Save assistant response (production only)
      if (user && conversationId && conversationId !== 'demo') {
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantText,
        })
      }
    },
  })

  return new Response(readableStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

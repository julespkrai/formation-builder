import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ai/conversations?formationId=...&courseId=...&moduleId=...
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  let user = null
  try { const { data } = await supabase.auth.getUser(); user = data.user } catch {}
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const formationId = searchParams.get('formationId')
  const courseId = searchParams.get('courseId')
  const moduleId = searchParams.get('moduleId')

  if (!formationId) return NextResponse.json({ error: 'Missing formationId' }, { status: 400 })

  let query = supabase
    .from('ai_conversations')
    .select('*, ai_messages(count)')
    .eq('formation_id', formationId)
    .order('created_at', { ascending: false })

  if (courseId) query = query.eq('course_id', courseId)
  else if (moduleId) query = query.eq('module_id', moduleId)
  else query = query.is('course_id', null).is('module_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/ai/conversations — create conversation
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let user = null
  try { const { data } = await supabase.auth.getUser(); user = data.user } catch {}
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formationId, courseId, moduleId, title } = await request.json()
  if (!formationId) return NextResponse.json({ error: 'Missing formationId' }, { status: 400 })

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      formation_id: formationId,
      course_id: courseId ?? null,
      module_id: moduleId ?? null,
      title: title ?? 'Nouvelle discussion',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/ai/conversations?id=...
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  let user = null
  try { const { data } = await supabase.auth.getUser(); user = data.user } catch {}
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('ai_conversations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// pdf-parse v2 is ESM-only, require() avoids the type resolution mismatch
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const formationId = formData.get('formationId') as string
  const title = formData.get('title') as string

  if (!file || !formationId || !title) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify formation belongs to user
  const { data: formation } = await supabase
    .from('formations')
    .select('id')
    .eq('id', formationId)
    .eq('user_id', user.id)
    .single()

  if (!formation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Extract text from PDF
  let rawContent = ''
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buffer)
    rawContent = data.text
  } catch (e) {
    console.error('PDF parse error:', e)
    rawContent = '[Extraction du texte échouée]'
  }

  // Store in DB (max 500k chars — limit of Claude's context window)
  const { error } = await supabase.from('knowledge_base').insert({
    formation_id: formationId,
    title,
    type: 'pdf',
    raw_content: rawContent.slice(0, 500000),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

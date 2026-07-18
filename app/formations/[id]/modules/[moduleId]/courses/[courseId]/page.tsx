import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_MODULES } from '@/lib/demo-data'
import CourseEditor from './CourseEditor'
import type { Resource } from '@/lib/types'

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string; courseId: string }>
}) {
  const { id, moduleId, courseId } = await params
  const cookieStore = await cookies()
  const demoAuth = cookieStore.get('demo_auth')?.value === 'true'

  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

  if (!user && !demoAuth) redirect('/login')

  if (demoAuth && !user) {
    const modules = DEMO_MODULES[id] ?? []
    const mod = modules.find(m => m.id === moduleId)
    const course = mod?.courses.find(c => c.id === courseId)
    if (!mod || !course) notFound()
    return (
      <CourseEditor
        course={course}
        module_={mod}
        formation={{ id, title: 'Démo', objectives: null, target_audience: null }}
        resources={[]}
        demoMode
      />
    )
  }

  const [{ data: course }, { data: module_ }, { data: formation }, { data: resources }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).single(),
    supabase.from('modules').select('*').eq('id', moduleId).single(),
    supabase.from('formations').select('id, title, objectives, target_audience').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('resources').select('*').eq('course_id', courseId).order('created_at'),
  ])

  if (!course || !module_ || !formation) notFound()

  return (
    <CourseEditor
      course={course}
      module_={module_}
      formation={formation}
      resources={(resources ?? []) as Resource[]}
    />
  )
}

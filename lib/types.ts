export type FormationStatus = 'draft' | 'in_progress' | 'ready' | 'published'

export type FormationStyle = {
  tone?: string
  expressions?: string
  examples?: string
}

export type Formation = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: FormationStatus
  objectives: string | null
  target_audience: string | null
  style?: FormationStyle
  created_at: string
  updated_at: string
}

export type Module = {
  id: string
  formation_id: string
  title: string
  description: string | null
  order: number
  created_at: string
}

export type Course = {
  id: string
  module_id: string
  title: string
  intro: string | null
  teleprompter_text: string | null
  estimated_seconds: number | null
  order: number
  created_at: string
  updated_at: string
}

export type Resource = {
  id: string
  formation_id: string | null
  course_id: string | null
  title: string
  type: 'pdf' | 'image' | 'link' | 'text'
  content: string | null
  file_path: string | null
  created_at: string
}

export type KnowledgeBase = {
  id: string
  formation_id: string
  title: string
  type: 'pdf' | 'text' | 'url'
  raw_content: string | null
  file_path: string | null
  created_at: string
}

export type ModuleWithCourses = Module & { courses: Course[] }

export type QuizQuestion = {
  id: string
  question: string
  options: [string, string, string, string]
  correct_index: 0 | 1 | 2 | 3
  explanation: string
}

export type Quiz = {
  id: string
  module_id: string
  questions: QuizQuestion[]
  created_at: string
  updated_at: string
}

export type AiConversation = {
  id: string
  formation_id: string
  course_id: string | null
  module_id: string | null
  title: string
  created_at: string
}

export type AiMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

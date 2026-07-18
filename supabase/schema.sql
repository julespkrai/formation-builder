-- Formation Builder — Schéma Supabase
-- Exécuter dans l'éditeur SQL de Supabase (Settings > SQL Editor)

-- ========================
-- TABLES
-- ========================

CREATE TABLE IF NOT EXISTS formations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_progress','ready','published')),
  objectives TEXT,
  target_audience TEXT,
  style JSONB DEFAULT '{}'::jsonb,  -- { tone, expressions, examples }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_id UUID REFERENCES formations ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  intro TEXT,
  teleprompter_text TEXT,
  estimated_seconds INT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_id UUID REFERENCES formations ON DELETE CASCADE,
  course_id UUID REFERENCES courses ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','image','link','text')),
  content TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_id UUID REFERENCES formations ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','text','url')),
  raw_content TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- TRIGGERS updated_at
-- ========================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- ROW LEVEL SECURITY
-- ========================

ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Formations : accès uniquement au propriétaire
CREATE POLICY "own_formations" ON formations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Modules : via formation
CREATE POLICY "own_modules" ON modules
  FOR ALL USING (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  ) WITH CHECK (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  );

-- Courses : via module > formation
CREATE POLICY "own_courses" ON courses
  FOR ALL USING (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN formations f ON f.id = m.formation_id
      WHERE f.user_id = auth.uid()
    )
  ) WITH CHECK (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN formations f ON f.id = m.formation_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Resources : via formation
CREATE POLICY "own_resources" ON resources
  FOR ALL USING (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  ) WITH CHECK (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  );

-- Knowledge base : via formation
CREATE POLICY "own_knowledge_base" ON knowledge_base
  FOR ALL USING (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  ) WITH CHECK (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  );

-- Quiz par module (questions en JSONB)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules ON DELETE CASCADE NOT NULL UNIQUE,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations IA (par formation / cours / module)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_id UUID REFERENCES formations ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses ON DELETE CASCADE,
  module_id UUID REFERENCES modules ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle discussion',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages des conversations IA
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- RLS — nouvelles tables
-- ========================

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_quizzes" ON quizzes
  FOR ALL USING (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN formations f ON f.id = m.formation_id
      WHERE f.user_id = auth.uid()
    )
  ) WITH CHECK (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN formations f ON f.id = m.formation_id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "own_ai_conversations" ON ai_conversations
  FOR ALL USING (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  ) WITH CHECK (
    formation_id IN (SELECT id FROM formations WHERE user_id = auth.uid())
  );

CREATE POLICY "own_ai_messages" ON ai_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM ai_conversations c
      JOIN formations f ON f.id = c.formation_id
      WHERE f.user_id = auth.uid()
    )
  ) WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM ai_conversations c
      JOIN formations f ON f.id = c.formation_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Trigger updated_at pour quizzes
CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- STORAGE (bucket knowledge-base)
-- Créer manuellement dans Supabase Storage > New Bucket > "knowledge-base" (private)
-- ========================

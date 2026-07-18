'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'

export default function NewFormationButton({
  userId,
  disabled = false,
}: {
  userId: string
  disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async () => {
    if (disabled) return
    setLoading(true)
    const { data, error } = await supabase
      .from('formations')
      .insert({ title: 'Nouvelle formation', user_id: userId })
      .select()
      .single()

    if (!error && data) {
      router.push(`/formations/${data.id}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading || disabled}
      title={disabled ? 'Connectez Supabase pour créer des formations' : undefined}
      className="flex items-center gap-2 bg-ocean text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-ocean-light transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus size={16} />
      {loading ? 'Création...' : 'Créer une formation'}
    </button>
  )
}

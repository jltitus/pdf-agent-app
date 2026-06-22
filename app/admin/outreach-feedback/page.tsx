'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'

const ACTIVITY_NAMES: Record<string, string> = {
  'prize-wheel': 'Food Preservation Trivia',
  'is-this-safe': '“Is This Safe?” Sorting Game',
  'preservation-bingo': 'Preservation Bingo',
  'shelf-life': 'How Long Does It Last?',
  'seasonal-planner': 'Seasonal Planner',
  'myth-busters': 'Myth Busters',
  'timeline-puzzle': 'Timeline Puzzle',
  'recipe-swap': 'Recipe Card Swap',
  'jar-display': 'What Went Wrong? Jar Display',
  'before-after': 'Before & After Jar Display',
}

type Feedback = {
  id: string
  activity_id: string
  rating: number
  age_tier: string | null
  worked: string | null
  improve: string | null
  created_at: string
}

function formatDate(v: string) {
  return new Date(v).toLocaleString()
}

export default function AdminOutreachFeedbackPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [rows, setRows] = useState<Feedback[]>([])
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const admin = profile?.role === 'admin'
    setIsAdmin(admin)
    if (admin) {
      const { data } = await supabase
        .from('outreach_activity_feedback')
        .select('id, activity_id, rating, age_tier, worked, improve, created_at')
        .order('created_at', { ascending: false })
      setRows((data as Feedback[]) || [])
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function remove(id: string) {
    if (!confirm('Delete this feedback?')) return
    const { error } = await supabase.from('outreach_activity_feedback').delete().eq('id', id)
    if (error) {
      setMsg(error.message)
      return
    }
    setRows((r) => r.filter((x) => x.id !== id))
  }

  const groups = useMemo(() => {
    const m = new Map<string, Feedback[]>()
    for (const r of rows) {
      const g = m.get(r.activity_id)
      if (g) g.push(r)
      else m.set(r.activity_id, [r])
    }
    return Array.from(m.entries())
      .map(([id, list]) => ({
        id,
        name: ACTIVITY_NAMES[id] || id,
        list,
        avg: list.reduce((s, x) => s + x.rating, 0) / list.length,
      }))
      .sort((a, b) => b.list.length - a.list.length)
  }, [rows])

  if (loading) return <div className="p-8 text-secondary">Loading…</div>
  if (!isAdmin) return <div className="p-8 text-secondary">Admins only.</div>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Outreach Activity Feedback</h1>
        <Link href="/admin" className="text-sm font-semibold text-[#1976D2] hover:underline">
          ← Admin
        </Link>
      </div>
      <p className="mb-6 text-sm text-secondary">
        Volunteer feedback on Toolkit activities ({rows.length} total). “What worked” shows as a tip on each activity card.
      </p>
      {msg && <p className="mb-4 text-sm font-semibold text-red-600">{msg}</p>}

      {groups.length === 0 && <p className="text-secondary">No feedback yet.</p>}

      {groups.map((g) => (
        <section key={g.id} className="mb-6 rounded-2xl border border-[#d8d1c7] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">{g.name}</h2>
            <span className="text-sm text-secondary">
              <b className="text-[#F5A623]">★ {g.avg.toFixed(1)}</b> · {g.list.length} response{g.list.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-3">
            {g.list.map((r) => (
              <div key={r.id} className="rounded-xl border border-[#ece6dc] bg-[#faf8f4] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    <span className="text-[#F5A623]">{'★'.repeat(r.rating)}</span>
                    <span className="text-[#d8d1c7]">{'★'.repeat(5 - r.rating)}</span>
                    {r.age_tier && <span className="ml-2 text-secondary">· {r.age_tier}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-secondary">{formatDate(r.created_at)}</span>
                    <button onClick={() => remove(r.id)} className="text-xs font-semibold text-red-600 hover:underline">
                      Delete
                    </button>
                  </span>
                </div>
                {r.worked && (
                  <p className="mt-1 text-primary">
                    <b>Worked:</b> {r.worked}
                  </p>
                )}
                {r.improve && (
                  <p className="mt-1 text-secondary">
                    <b>Change:</b> {r.improve}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

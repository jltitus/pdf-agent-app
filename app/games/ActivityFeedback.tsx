'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

const TIERS = ['Kids', 'Tweens', 'Teens', 'Adults', 'Mixed ages']

type Row = { rating: number; worked: string | null; age_tier: string | null; created_at: string }

function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onPick ? () => onPick(n) : undefined}
          className={onPick ? 'cursor-pointer text-2xl leading-none' : 'text-base leading-none'}
          style={{ color: n <= value ? '#F5A623' : '#d8d1c7' }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </span>
  )
}

export default function ActivityFeedback({ activityId, accent }: { activityId: string; accent: string }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [tier, setTier] = useState('')
  const [worked, setWorked] = useState('')
  const [improve, setImprove] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await supabase
      .from('outreach_activity_feedback')
      .select('rating, worked, age_tier, created_at')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })
    setRows((data as Row[]) || [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])

  const count = rows.length
  const avg = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0
  const tip = rows.find((r) => (r.worked || '').trim())?.worked?.trim() || ''

  async function submit() {
    if (!rating) {
      setErr('Please pick a star rating.')
      return
    }
    setSaving(true)
    setErr('')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setErr('Please sign in to share feedback.')
      setSaving(false)
      return
    }
    const { error } = await supabase.from('outreach_activity_feedback').insert({
      activity_id: activityId,
      user_id: user.id,
      rating,
      age_tier: tier || null,
      worked: worked.trim() || null,
      improve: improve.trim() || null,
    })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setDone(true)
    setOpen(false)
    setRating(0)
    setTier('')
    setWorked('')
    setImprove('')
    load()
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#ece6dc] bg-[#faf8f4] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-secondary">
          {count ? (
            <span className="inline-flex items-center gap-2">
              <Stars value={Math.round(avg)} /> <b className="text-primary">{avg.toFixed(1)}</b> ·{' '}
              {count} {count === 1 ? 'volunteer used this' : 'volunteers used this'}
            </span>
          ) : (
            <span>Used this at an event? Be the first to share how it went.</span>
          )}
        </div>
        {!open && (
          <button
            onClick={() => {
              setOpen(true)
              setDone(false)
            }}
            className="rounded-xl border-2 px-4 py-2 text-sm font-bold"
            style={{ borderColor: accent, color: accent }}
          >
            Share how it went
          </button>
        )}
      </div>

      {done && !open && <p className="mt-2 text-sm font-semibold text-[#2E7D32]">Thanks for the feedback! 🎉</p>}
      {tip && !open && !done && (
        <p className="mt-2 text-sm text-secondary">
          💡 <b>Volunteer tip:</b> {tip}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">Your rating:</span>
            <Stars value={rating} onPick={setRating} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary">Age group it worked best for</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm"
            >
              <option value="">— optional —</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary">What worked well?</label>
            <textarea
              value={worked}
              onChange={(e) => setWorked(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm"
              placeholder="A tip other volunteers would find useful…"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary">What would you change?</label>
            <textarea
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
          {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-xl bg-[#d73f09] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Submit feedback'}
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setErr('')
              }}
              className="rounded-xl border border-[#d8d1c7] px-5 py-2 text-sm font-semibold text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

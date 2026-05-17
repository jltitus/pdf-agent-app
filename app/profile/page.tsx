'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'
import { createClient } from '../../lib/supabase/client'

type Profile = {
  id: string
  full_name: string | null
  role: string | null
  is_active: boolean | null
  city: string | null
  county: string | null
  state: string | null
  mfp_affiliation: string | null
  specialties: string[] | null
  website_url: string | null
  social_url: string | null
  profile_url: string | null
  avatar_url: string | null
  bio: string | null
  is_profile_public: boolean | null
  last_activity_at: string | null
  last_login_at: string | null
  last_chat_at: string | null
  total_questions_asked: number | null
}

type FavoritePublication = {
  id: string
  created_at: string
  document_id: string
  documents: {
    id: string
    title: string | null
    filename: string
    category?: string | null
    version?: string | null
  } | null
}

export default function ProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [favorites, setFavorites] = useState<FavoritePublication[]>([])

  useEffect(() => {
    async function loadProfile() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        window.location.href = '/login'
        return
      }

      setEmail(sessionData.session.user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()

      setProfile((data ?? null) as Profile | null)

      const favoritesResponse = await fetch('/api/favorites')
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json()
        setFavorites(favoritesData.favorites ?? [])
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase])

  function formatDate(value?: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleString()
  }

  function getPdfHref(filename: string) {
    return `/api/view-source?file=${encodeURIComponent(filename)}`
  }

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-3 py-5 text-primary sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {loading ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              Loading profile...
            </section>
          ) : !profile ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              <h1 className="text-2xl font-bold">Profile not found</h1>
              <p className="mt-2 text-secondary">
                Your account exists, but no profile record was found.
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-100 text-3xl font-bold text-secondary">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={`${profile.full_name || 'User'} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profile.full_name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>

                    <div>
                      <h1 className="text-2xl font-bold sm:text-3xl">
                        {profile.full_name || 'My Profile'}
                      </h1>
                      <p className="mt-1 text-sm text-secondary">{email}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-secondary">
                          {profile.role || 'user'}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            profile.is_profile_public
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {profile.is_profile_public ? 'Public profile' : 'Private profile'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href="/profile/edit"
                    className="min-h-11 rounded-lg bg-black px-4 py-2 text-center text-sm font-semibold !text-white shadow-sm"
                  >
                    Edit profile
                  </a>
                </div>

                {profile.bio && (
                  <div className="mt-6 rounded-xl border border-gray-300 bg-gray-50 p-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                      About
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap text-secondary">{profile.bio}</p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Saved Publications</h2>
                    <p className="mt-1 text-sm text-secondary">
                      Publications you saved from the library.
                    </p>
                  </div>

                  <a
                    href="/publications"
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-primary shadow-sm hover:bg-gray-100"
                  >
                    Browse publications
                  </a>
                </div>

                {favorites.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-secondary">
                    No saved publications yet.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {favorites.map((favorite) => {
                      const doc = favorite.documents
                      if (!doc) return null

                      return (
                        <article
                          key={favorite.id}
                          className="rounded-xl border border-gray-300 bg-gray-50 p-4"
                        >
                          <h3 className="font-bold text-primary">
                            {doc.title || doc.filename}
                          </h3>
                          <p className="mt-1 break-words text-xs text-muted">{doc.filename}</p>

                          <div className="mt-3 space-y-1 text-sm text-secondary">
                            <p><strong>Category:</strong> {doc.category || 'Not listed'}</p>
                            <p><strong>Version:</strong> {doc.version || 'Not listed'}</p>
                            <p><strong>Saved:</strong> {formatDate(favorite.created_at)}</p>
                          </div>

                          <a
                            href={getPdfHref(doc.filename)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold !text-white shadow-sm hover:bg-gray-800 sm:w-auto"
                          >
                            Open PDF
                          </a>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold">MFP Details</h2>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-semibold text-primary">Affiliation</dt>
                      <dd className="text-secondary">{profile.mfp_affiliation || '—'}</dd>
                    </div>

                    <div>
                      <dt className="font-semibold text-primary">Location</dt>
                      <dd className="text-secondary">
                        {[profile.city, profile.county, profile.state].filter(Boolean).join(', ') || '—'}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-semibold text-primary">Specialties / interests</dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {(profile.specialties ?? []).length > 0 ? (
                          profile.specialties?.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-secondary"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold">Links</h2>

                  <div className="mt-4 space-y-3 text-sm">
                    {profile.website_url && (
                      <a className="block break-words text-blue-700 underline" href={profile.website_url} target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    )}

                    {profile.social_url && (
                      <a className="block break-words text-blue-700 underline" href={profile.social_url} target="_blank" rel="noopener noreferrer">
                        Social profile
                      </a>
                    )}

                    {profile.profile_url && (
                      <a className="block break-words text-blue-700 underline" href={profile.profile_url} target="_blank" rel="noopener noreferrer">
                        Other profile link
                      </a>
                    )}

                    {!profile.website_url && !profile.social_url && !profile.profile_url && (
                      <p className="text-secondary">No links added yet.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">Activity Summary</h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Questions asked</p>
                    <p className="mt-1 text-2xl font-bold">{profile.total_questions_asked ?? 0}</p>
                  </div>

                  <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Last login</p>
                    <p className="mt-1 text-sm text-secondary">{formatDate(profile.last_login_at)}</p>
                  </div>

                  <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Last chat</p>
                    <p className="mt-1 text-sm text-secondary">{formatDate(profile.last_chat_at)}</p>
                  </div>

                  <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Last activity</p>
                    <p className="mt-1 text-sm text-secondary">{formatDate(profile.last_activity_at)}</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}
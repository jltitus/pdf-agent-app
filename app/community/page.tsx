'use client'

import { useEffect, useMemo, useState } from 'react'
import HeaderBar from '../components/HeaderBar'
import { createClient } from '../../lib/supabase/client'

type PublicProfile = {
  id: string
  full_name: string | null
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
}

export default function CommunityPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadProfiles() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        window.location.href = '/login'
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select(
          'id, full_name, city, county, state, mfp_affiliation, specialties, website_url, social_url, profile_url, avatar_url, bio'
        )
        .eq('is_profile_public', true)
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      setProfiles((data ?? []) as PublicProfile[])
      setLoading(false)
    }

    loadProfiles()
  }, [supabase])

  const filteredProfiles = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) return profiles

    return profiles.filter((profile) => {
      const searchable = [
        profile.full_name,
        profile.city,
        profile.county,
        profile.state,
        profile.mfp_affiliation,
        profile.bio,
        ...(profile.specialties ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(value)
    })
  }, [profiles, search])

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-3 py-5 text-primary sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Community Directory</h1>
                <p className="mt-1 text-secondary">
                  Discover other MFP Publication Agent users who chose to share a public profile.
                </p>
              </div>

              <a
                href="/profile/edit"
                className="min-h-11 rounded-lg bg-black px-4 py-2 text-center text-sm font-semibold !text-white shadow-sm"
              >
                Edit my profile
              </a>
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-sm font-semibold text-primary">
                Search community
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, county, state, affiliation, or interests..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
              />
            </div>
          </section>

          {loading ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              Loading community directory...
            </section>
          ) : profiles.length === 0 ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">No public profiles yet</h2>
              <p className="mt-2 text-secondary">
                Profiles only appear here when users turn on public directory visibility.
              </p>
            </section>
          ) : filteredProfiles.length === 0 ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">No matches</h2>
              <p className="mt-2 text-secondary">
                Try a different name, county, state, affiliation, or specialty.
              </p>
            </section>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <article
                  key={profile.id}
                  className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-100 text-xl font-bold text-secondary">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={`${profile.full_name || 'Community member'} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profile.full_name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold text-primary">
                        {profile.full_name || 'Community member'}
                      </h2>

                      <p className="mt-1 text-sm text-secondary">
                        {[profile.city, profile.county, profile.state].filter(Boolean).join(', ') || 'Location not shared'}
                      </p>

                      {profile.mfp_affiliation && (
                        <p className="mt-1 text-sm font-semibold text-secondary">
                          {profile.mfp_affiliation}
                        </p>
                      )}
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm text-secondary">
                      {profile.bio}
                    </p>
                  )}

                  {(profile.specialties ?? []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.specialties?.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-secondary"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                    {profile.website_url && (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-gray-100"
                      >
                        Website
                      </a>
                    )}

                    {profile.social_url && (
                      <a
                        href={profile.social_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-gray-100"
                      >
                        Social
                      </a>
                    )}

                    {profile.profile_url && (
                      <a
                        href={profile.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-gray-100"
                      >
                        Profile
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  )
}
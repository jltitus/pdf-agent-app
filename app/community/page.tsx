'use client'

import { useEffect, useMemo, useState } from 'react'
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
  phone: string | null
  show_phone: boolean | null
  show_email: boolean | null
  email: string | null
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
          'id, full_name, city, county, state, mfp_affiliation, specialties, website_url, social_url, profile_url, avatar_url, bio, phone, show_phone, show_email, email'
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
   

      <main className="min-h-screen bg-[#f7f4ef] px-3 py-5 text-primary sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
            <div className="bg-[#d73f09] px-5 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Oregon State University Extension
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Professional preservation directory
                </p>

                <h1 className="mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                  Connect with Oregon Master Food Preservers
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-secondary sm:text-lg">
                  Discover fellow Master Food Preservers by region,
                  specialties, interests, and preservation experience.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/profile/edit"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d73f09] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b23408]"
                  >
                    Update my profile
                  </a>

                  <a
                    href="/profile"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
                  >
                    View my profile
                  </a>
                </div>
              </div>

              <aside className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
                <h2 className="text-xl font-bold text-primary">
                  Community expertise network
                </h2>

                <p className="mt-3 text-sm leading-6 text-secondary">
                  Public profiles help Oregon Master Food Preservers connect
                  with peers who share similar preservation interests,
                  specialties, and regional expertise.
                </p>

                <div className="mt-5 rounded-xl border border-[#ead9bf] bg-[#f7f0dd] p-4 text-sm leading-6 text-secondary">
                  <strong className="text-primary">
                    Privacy reminder:
                  </strong>{' '}
                  Only profiles marked public appear in this directory.
                </div>
              </aside>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                  Search directory
                </p>

                <h2 className="mt-2 text-2xl font-bold text-primary">
                  Find preservation expertise
                </h2>

                <p className="mt-2 text-sm leading-6 text-secondary">
                  Search by name, specialty, county, affiliation, or preservation interests.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search specialties, county, interests..."
                  className="w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm text-primary"
                />
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
              Loading professional directory...
            </section>
          ) : profiles.length === 0 ? (
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-primary">
                No public profiles yet
              </h2>

              <p className="mt-3 text-secondary">
                Profiles appear here when users enable public directory visibility.
              </p>
            </section>
          ) : filteredProfiles.length === 0 ? (
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-primary">
                No matching profiles
              </h2>

              <p className="mt-3 text-secondary">
                Try searching by specialty, county, affiliation, or preservation topic.
              </p>
            </section>
          ) : (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <article
                  key={profile.id}
                  className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm"
                >
                  <div className="border-b border-[#e8e1d8] bg-[#fcfaf7] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8d1c7] bg-[#f3f0ed] text-xl font-bold text-secondary">
                        {profile.avatar_url ? (
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
                        <h2 className="break-words text-xl font-bold text-primary">
                          {profile.full_name || 'Community member'}
                        </h2>

                        <p className="mt-1 text-sm text-secondary">
                          {[profile.city, profile.county, profile.state]
                            .filter(Boolean)
                            .join(', ') || 'Location not shared'}
                        </p>

                        {profile.mfp_affiliation && (
                          <p className="mt-2 inline-flex rounded-full bg-[#e7f0e7] px-3 py-1 text-xs font-semibold text-[#36543b]">
                            {profile.mfp_affiliation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    {profile.bio && (
                      <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-secondary">
                        {profile.bio}
                      </p>
                    )}

                    {(profile.specialties ?? []).length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                          Specialties
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {profile.specialties?.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[#d8d1c7] bg-[#f7f4ef] px-3 py-1 text-xs font-semibold text-secondary"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 border-t border-[#ece5dc] pt-4">
                      {profile.show_phone && profile.phone && (
                        <a
                          href={`tel:${profile.phone}`}
                          className="inline-flex min-h-11 items-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                        >
                          📞 {profile.phone}
                        </a>
                      )}

                      {profile.show_email && profile.email && (
                        <a
                          href={`mailto:${profile.email}`}
                          className="inline-flex min-h-11 items-center rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                        >
                          ✉️ {profile.email}
                        </a>
                      )}

                      {profile.website_url && (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                        >
                          Website
                        </a>
                      )}

                      {profile.social_url && (
                        <a
                          href={profile.social_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                        >
                          Social
                        </a>
                      )}

                      {profile.profile_url && (
                        <a
                          href={profile.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-[#d8d1c7] bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-[#f3f0ed]"
                        >
                          Profile
                        </a>
                      )}
                    </div>
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
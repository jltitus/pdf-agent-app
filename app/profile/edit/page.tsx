'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

type ProfileForm = {
  full_name: string
  city: string
  county: string
  state: string
  mfp_affiliation: string
  specialtiesText: string
  website_url: string
  social_url: string
  profile_url: string
  avatar_url: string
  bio: string
  phone: string
  is_profile_public: boolean
  show_phone: boolean
  show_email: boolean
}

export default function EditProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')

  const [form, setForm] = useState<ProfileForm>({
    full_name: '',
    city: '',
    county: '',
    state: '',
    mfp_affiliation: '',
    specialtiesText: '',
    website_url: '',
    social_url: '',
    profile_url: '',
    avatar_url: '',
    bio: '',
    phone: '',
    is_profile_public: false,
    show_phone: false,
    show_email: false,
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        window.location.href = '/login'
        return
      }

      setUserId(sessionData.session.user.id)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()

      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          city: data.city ?? '',
          county: data.county ?? '',
          state: data.state ?? '',
          mfp_affiliation: data.mfp_affiliation ?? '',
          specialtiesText: Array.isArray(data.specialties)
            ? data.specialties.join(', ')
            : '',
          website_url: data.website_url ?? '',
          social_url: data.social_url ?? '',
          profile_url: data.profile_url ?? '',
          avatar_url: data.avatar_url ?? '',
          bio: data.bio ?? '',
          phone: data.phone ?? '',
          is_profile_public: Boolean(data.is_profile_public),
          show_phone: Boolean(data.show_phone),
          show_email: Boolean(data.show_email),
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase])

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function normalizeUrl(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true)
    setMessage('Uploading profile photo...')

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.')
      setUploadingAvatar(false)
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Profile photo must be 2 MB or smaller.')
      setUploadingAvatar(false)
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt)
      ? fileExt
      : 'png'
    const path = `${userId}/${Date.now()}.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      setMessage(`Avatar upload failed: ${uploadError.message}`)
      setUploadingAvatar(false)
      return
    }

    const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path)

    updateField('avatar_url', data.publicUrl)
    setMessage('Profile photo uploaded. Save your profile to keep this change.')
    setUploadingAvatar(false)
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage('Saving profile...')

    const specialties = form.specialtiesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim() || null,
        city: form.city.trim() || null,
        county: form.county.trim() || null,
        state: form.state.trim() || null,
        mfp_affiliation: form.mfp_affiliation.trim() || null,
        specialties,
        website_url: normalizeUrl(form.website_url),
        social_url: normalizeUrl(form.social_url),
        profile_url: normalizeUrl(form.profile_url),
        avatar_url: form.avatar_url || null,
        bio: form.bio.trim() || null,
        phone: form.phone.trim() || null,
        is_profile_public: form.is_profile_public,
        show_phone: form.show_phone,
        show_email: form.show_email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      setMessage(`Profile save failed: ${error.message}`)
      setSaving(false)
      return
    }

    setMessage('Profile saved.')
    setSaving(false)
  }

  const inputClass =
    'w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm text-primary'
  const labelClass = 'mb-1 block text-sm font-semibold text-primary'

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-3 py-5 text-primary sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-[#d8d1c7] bg-white shadow-sm">
          <div className="bg-[#d73f09] px-5 py-2.5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Oregon State University Extension
            </p>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d73f09]">
                MFP professional profile
              </p>

              <h1 className="mt-3 text-3xl font-bold leading-tight text-primary">
                Edit profile
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
                Share your preservation interests, location, and areas of
                experience so other Oregon Master Food Preservers can connect
                with you through the professional directory.
              </p>
            </div>

            <aside className="rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-5">
              <h2 className="text-xl font-bold text-primary">
                Directory visibility
              </h2>

              <p className="mt-3 text-sm leading-6 text-secondary">
                Public profiles are visible only to authenticated users. Your
                email address is not shown in the community directory.
              </p>
            </aside>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-[#d8d1c7] bg-white p-4 text-sm text-primary shadow-sm">
            {message}
          </div>
        )}

        {loading ? (
          <section className="rounded-3xl border border-[#d8d1c7] bg-white p-6 shadow-sm">
            Loading profile...
          </section>
        ) : (
          <form onSubmit={saveProfile} className="space-y-6">
            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-bold text-primary">
                Profile photo
              </h2>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#d8d1c7] bg-[#f3f0ed] text-3xl font-bold text-secondary">
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt="Profile avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    form.full_name.charAt(0).toUpperCase() || '?'
                  )}
                </div>

                <div className="flex-1">
                  <label className={labelClass}>Upload profile photo</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadAvatar(file)
                    }}
                    className={inputClass}
                    disabled={uploadingAvatar}
                  />
                  <p className="mt-2 text-xs leading-5 text-muted">
                    PNG, JPG, or WebP. Maximum size: 2 MB. Save your profile
                    after uploading to keep the new photo.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-bold text-primary">
                Professional details
              </h2>

              <p className="mt-2 text-sm leading-6 text-secondary">
                These details help other MFPs find peers by affiliation,
                geography, and preservation interests.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full name</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>MFP affiliation</label>
                  <input
                    value={form.mfp_affiliation}
                    onChange={(e) =>
                      updateField('mfp_affiliation', e.target.value)
                    }
                    placeholder="Example: County MFP program, Extension office, volunteer group"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>City</label>
                  <input
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>County</label>
                  <input
                    value={form.county}
                    onChange={(e) => updateField('county', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>State</label>
                  <input
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="Example: OR"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Specialties / interests</label>
                  <input
                    value={form.specialtiesText}
                    onChange={(e) =>
                      updateField('specialtiesText', e.target.value)
                    }
                    placeholder="Canning, freezing, drying, jams"
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-muted">
                    Separate items with commas.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    className="min-h-[130px] w-full rounded-xl border border-[#d8d1c7] bg-white px-4 py-3 text-sm text-primary"
                    placeholder="Share a short introduction, preservation interests, community role, or areas where you enjoy helping others."
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-bold text-primary">
                Optional links
              </h2>

              <p className="mt-2 text-sm leading-6 text-secondary">
                Add public professional or program links you are comfortable
                sharing with authenticated MFP users.
              </p>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className={labelClass}>Website</label>
                  <input
                    value={form.website_url}
                    onChange={(e) => updateField('website_url', e.target.value)}
                    placeholder="https://example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Social link</label>
                  <input
                    value={form.social_url}
                    onChange={(e) => updateField('social_url', e.target.value)}
                    placeholder="Facebook, Instagram, LinkedIn, etc."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Other profile link</label>
                  <input
                    value={form.profile_url}
                    onChange={(e) => updateField('profile_url', e.target.value)}
                    placeholder="Extension profile, program page, or other public profile"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#d8d1c7] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-2xl font-bold text-primary">Contact &amp; Privacy</h2>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Add contact details and choose what other authenticated MFP members can see.
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className={labelClass}>Phone number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="Example: 541-555-0100"
                    className={inputClass}
                  />
                </div>

                <label className="flex gap-3 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4">
                  <input
                    type="checkbox"
                    checked={form.show_phone}
                    onChange={(e) => updateField('show_phone', e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#d73f09]"
                  />
                  <span>
                    <span className="block font-semibold text-primary">Show my phone number in the directory</span>
                    <span className="mt-1 block text-sm leading-6 text-secondary">Only visible to authenticated MFP members.</span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4">
                  <input
                    type="checkbox"
                    checked={form.show_email}
                    onChange={(e) => updateField('show_email', e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#d73f09]"
                  />
                  <span>
                    <span className="block font-semibold text-primary">Show my email address in the directory</span>
                    <span className="mt-1 block text-sm leading-6 text-secondary">Only visible to authenticated MFP members.</span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-2xl border border-[#d8d1c7] bg-[#fcfaf7] p-4">
                  <input
                    type="checkbox"
                    checked={form.is_profile_public}
                    onChange={(e) => updateField('is_profile_public', e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#d73f09]"
                  />
                  <span>
                    <span className="block font-semibold text-primary">Show my profile in the professional directory</span>
                    <span className="mt-1 block text-sm leading-6 text-secondary">
                      When enabled, authenticated users can see your name, location, affiliation, specialties, bio, avatar, and public links.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="min-h-11 rounded-xl bg-[#d73f09] px-5 py-3 text-sm font-semibold !text-white shadow-sm hover:bg-[#b23408] disabled:bg-[#9b3518]"
              >
                {saving ? 'Saving...' : 'Save profile'}
              </button>

              <a
                href="/profile"
                className="min-h-11 rounded-xl border border-[#d8d1c7] bg-white px-5 py-3 text-center text-sm font-semibold text-primary hover:bg-[#f3f0ed]"
              >
                Back to profile
              </a>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
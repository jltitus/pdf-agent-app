'use client'

import { useEffect, useState } from 'react'
import HeaderBar from '../../components/HeaderBar'
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
  is_profile_public: boolean
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
    is_profile_public: false,
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
          specialtiesText: Array.isArray(data.specialties) ? data.specialties.join(', ') : '',
          website_url: data.website_url ?? '',
          social_url: data.social_url ?? '',
          profile_url: data.profile_url ?? '',
          avatar_url: data.avatar_url ?? '',
          bio: data.bio ?? '',
          is_profile_public: Boolean(data.is_profile_public),
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase])

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function normalizeUrl(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
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
    const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt) ? fileExt : 'png'
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
        is_profile_public: form.is_profile_public,
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
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary'
  const labelClass = 'mb-1 block text-sm font-semibold text-primary'

  return (
    <>
      <HeaderBar />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-3 py-5 text-primary sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Edit Profile</h1>
            <p className="mt-1 text-secondary">
              Choose what to share with the MFP community directory.
            </p>
          </div>

          {message && (
            <div className="rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm">
              {message}
            </div>
          )}

          {loading ? (
            <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
              Loading profile...
            </section>
          ) : (
            <form onSubmit={saveProfile} className="space-y-6">
              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold">Profile Photo</h2>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-100 text-3xl font-bold text-secondary">
                    {form.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                    <label className={labelClass}>Upload avatar</label>
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
                    <p className="mt-1 text-xs text-muted">
                      PNG, JPG, or WebP. Maximum size: 2 MB.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold">Basic Information</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                      onChange={(e) => updateField('mfp_affiliation', e.target.value)}
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
                      onChange={(e) => updateField('specialtiesText', e.target.value)}
                      placeholder="Canning, freezing, drying, jams"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-muted">Separate items with commas.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => updateField('bio', e.target.value)}
                      className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary"
                      placeholder="Share a short introduction, food preservation interests, or community role."
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold">Links</h2>

                <div className="mt-4 grid gap-4">
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

              <section className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold">Privacy</h2>

                <label className="mt-4 flex gap-3 rounded-xl border border-gray-300 bg-gray-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.is_profile_public}
                    onChange={(e) => updateField('is_profile_public', e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-semibold text-primary">
                      Show my profile in the community directory
                    </span>
                    <span className="mt-1 block text-sm text-secondary">
                      Public profiles are visible to authenticated users only. Your email address is not shown in the directory.
                    </span>
                  </span>
                </label>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || uploadingAvatar}
                  className="min-h-11 rounded-lg bg-black px-4 py-2 text-sm font-semibold !text-white shadow-sm disabled:bg-gray-700"
                >
                  {saving ? 'Saving...' : 'Save profile'}
                </button>

                <a
                  href="/profile"
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-primary hover:bg-gray-100"
                >
                  Back to profile
                </a>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
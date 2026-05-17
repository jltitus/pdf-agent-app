import Link from 'next/link'

type SessionExpiredPageProps = {
  searchParams?: Promise<{
    redirectTo?: string
  }>
}

export default async function SessionExpiredPage({
  searchParams,
}: SessionExpiredPageProps) {
  const params = await searchParams
  const redirectTo = params?.redirectTo || '/dashboard'
  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}&message=session-expired`

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 px-4 py-8 text-primary">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <img
              src="/jar-logosm.png"
              alt="MFP Publication Agent logo"
              className="h-12 w-12 object-contain"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                MFP Publication Agent
              </p>
              <h1 className="text-2xl font-bold text-primary">
                Session expired
              </h1>
            </div>
          </div>

          <p className="text-sm leading-6 text-secondary">
            For your security, please sign in again to continue.
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href={loginHref}
              className="min-h-12 rounded-xl bg-black px-4 py-3 text-center text-sm font-semibold !text-white shadow-sm"
            >
              Sign in again
            </Link>

            <Link
              href="/request-access"
              className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-sm hover:bg-gray-100"
            >
              Request access
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeTempPassword() {
  return `Temp-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 6)}!`
}

export async function POST(request: Request) {
  try {
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const {
      data: { user: adminUser },
    } = await supabaseAdmin.auth.getUser(token)

    if (!adminUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', adminUser.id)
      .single()

    if (adminProfile?.role !== 'admin' || !adminProfile?.is_active) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: accessRequest, error: requestError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    if (accessRequest.status === 'approved') {
      return NextResponse.json({ error: 'Request is already approved' }, { status: 400 })
    }

    const temporaryPassword = makeTempPassword()

// Create user WITHOUT password (invite flow)
const { data: createdUser, error: createUserError } =
  await supabaseAdmin.auth.admin.inviteUserByEmail(accessRequest.email, {
    data: {
      full_name: accessRequest.full_name,
    },
  })

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { error: createUserError?.message ?? 'Could not create user' },
        { status: 500 }
      )
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: createdUser.user.id,
      full_name: accessRequest.full_name,
      role: 'member',
      is_active: true,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.id,
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

return NextResponse.json({
  success: true,
  email: accessRequest.email,
  invited: true,
})
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Unknown approval error' },
      { status: 500 }
    )
  }
}
import type { SupabaseClient } from '@supabase/supabase-js'

type AuditStatus = 'success' | 'failure'

type AuditEventInput = {
  supabaseAdmin: SupabaseClient
  actorUserId?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  status?: AuditStatus
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

export async function logAuditEvent({
  supabaseAdmin,
  actorUserId,
  actorEmail,
  actorRole,
  action,
  targetType,
  targetId,
  status = 'success',
  ipAddress,
  userAgent,
  metadata = {},
}: AuditEventInput) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: actorUserId ?? null,
      actor_email: actorEmail ?? null,
      actor_role: actorRole ?? null,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      status,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      metadata,
    })

    if (error) {
      console.error('AUDIT LOG INSERT ERROR:', error.message)
    }
  } catch (error) {
    console.error('AUDIT LOG UNEXPECTED ERROR:', error)
  }
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

export function getRequestUserAgent(request: Request) {
  return request.headers.get('user-agent')
}
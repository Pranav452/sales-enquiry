import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export interface PushPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
}

function initVapid() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const mail = process.env.VAPID_MAILTO
  if (!pub || !priv || !mail) return false
  webpush.setVapidDetails(mail, pub, priv)
  return true
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!initVapid()) return

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single()

  if (!data?.subscription) return

  try {
    await webpush.sendNotification(data.subscription as webpush.PushSubscription, JSON.stringify(payload))
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  }
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !initVapid()) return

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', userIds)

  if (!data?.length) return

  await Promise.allSettled(
    data.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription as webpush.PushSubscription, JSON.stringify(payload))
      } catch (err: unknown) {
        if ((err as { statusCode?: number })?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('user_id', row.user_id)
        }
      }
    })
  )
}

// ============================================================
// Browser events that tie the CRM to the game layer.
// ActivityForm emits; the game store + pet listen.
// ============================================================

export const GAME_ACTIVITY_EVENT = "game:activity-logged"

export interface ActivityLoggedDetail {
  activityType: string
  points:       number
}

export function emitActivityLogged(detail: ActivityLoggedDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<ActivityLoggedDetail>(GAME_ACTIVITY_EVENT, { detail }))
}

export function onActivityLogged(cb: (d: ActivityLoggedDetail) => void): () => void {
  if (typeof window === "undefined") return () => {}
  const handler = (e: Event) => cb((e as CustomEvent<ActivityLoggedDetail>).detail)
  window.addEventListener(GAME_ACTIVITY_EVENT, handler)
  return () => window.removeEventListener(GAME_ACTIVITY_EVENT, handler)
}

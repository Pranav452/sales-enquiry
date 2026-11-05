"use client"

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react"
import dynamic from "next/dynamic"
import { MotionConfig } from "framer-motion"
import { Award, Gamepad2, Hexagon, Layers, List, Plus, Users, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ActivityForm } from "@/components/activities/ActivityForm"
import { ActivityList, type Activity } from "@/components/activities/ActivityList"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGameStore } from "@/lib/game/store"
import { ProgressCard } from "@/components/game/hub/ProgressCard"
import { QuestBoard } from "@/components/game/hub/QuestBoard"
import { Leaderboard } from "@/components/game/hub/Leaderboard"
import { Progression } from "@/components/game/hub/Progression"
import { TrophyCabinet } from "@/components/game/hub/TrophyCabinet"
import { HubEmpty, HubError, HubSkeleton, PanelMessage } from "@/components/game/hub/HubStates"

// The Arcade and Hexagone tabs (Hexagone has a three.js stage) only load
// when their tab is opened.
const ArcadePanel = dynamic(
  () => import("@/components/game/arcade/ArcadePanel").then((m) => m.ArcadePanel),
  { ssr: false, loading: () => <PanelMessage title="Arcade" body="Loading..." /> },
)
const Hexagone = dynamic(
  () => import("@/components/game/hexagone/Hexagone").then((m) => m.Hexagone),
  { ssr: false, loading: () => <PanelMessage title="Hexagone" body="Loading..." /> },
)

interface UserInfo { role: string; salesperson: string | null }

type FormDefaults = NonNullable<ComponentProps<typeof ActivityForm>["defaultValues"]>

type HubTab = "log" | "leaderboard" | "trophies" | "progression" | "arcade" | "hexagone"

const TABS: { value: HubTab; label: string; icon: typeof List }[] = [
  { value: "log",         label: "Activity log", icon: List },
  { value: "leaderboard", label: "Leaderboard",  icon: Users },
  { value: "trophies",    label: "Trophies",     icon: Award },
  { value: "progression", label: "Progression",  icon: Layers },
  { value: "arcade",      label: "Arcade",       icon: Gamepad2 },
  { value: "hexagone",    label: "Hexagone",     icon: Hexagon },
]

function isHubTab(v: string): v is HubTab {
  return TABS.some((t) => t.value === v)
}

export default function ActivitiesPage() {
  const [userInfo, setUserInfo]                 = useState<UserInfo | null>(null)
  const [showForm, setShowForm]                 = useState(false)
  const [editingActivity, setEditing]           = useState<Activity | null>(null)
  const [followUpDefaults, setFollowUpDefaults] = useState<FormDefaults | null>(null)
  const [refresh, setRefresh]                   = useState(0)
  const [tab, setTab]                           = useState<HubTab>("log")
  const [scrollTick, setScrollTick]             = useState(0)
  const formRef = useRef<HTMLDivElement>(null)

  const data    = useGameStore((s) => s.data)
  const loading = useGameStore((s) => s.loading)
  const error   = useGameStore((s) => s.error)
  const ensure  = useGameStore((s) => s.ensure)
  const refreshGame = useGameStore((s) => s.refresh)
  const me = data?.me ?? null

  useEffect(() => { void ensure() }, [ensure])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("user_profiles")
        .select("role, salesperson")
        .eq("id", user.id)
        .single()
      setUserInfo({ role: data?.role ?? "sales", salesperson: data?.salesperson ?? null })
    })
  }, [])

  // Bring the log/edit form into view whenever it is opened.
  useEffect(() => {
    if (scrollTick > 0) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [scrollTick])

  const openNewForm = useCallback(() => {
    setEditing(null)
    setFollowUpDefaults(null)
    setShowForm(true)
    setScrollTick((v) => v + 1)
  }, [])

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFollowUpDefaults(null)
  }

  function handleFormSuccess(_id: string, _points: number, isEdit: boolean) {
    closeForm()
    setRefresh((v) => v + 1)
    // New activities refresh the game via the activity-logged event;
    // edits can change XP too, so refresh explicitly.
    if (isEdit) void refreshGame()
  }

  const isAdmin = userInfo?.role === "admin"
  const formOpen = showForm || !!editingActivity

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-screen-xl space-y-4 p-4">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Activity Tracker</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Log calls and visits to earn XP, complete quests and progress through levels.
            </p>
          </div>
          <Button size="sm" onClick={openNewForm} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" aria-hidden /> Log Activity
          </Button>
        </div>

        {/* ── Log / Edit form ──────────────────────────────── */}
        {formOpen && (
          <div ref={formRef} className="scroll-mt-20 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  {editingActivity ? "Edit Activity" : followUpDefaults ? "Log Follow-up Call" : "Log New Activity"}
                </h2>
                {editingActivity?.client_name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {editingActivity.client_name}
                    {editingActivity.activity_date
                      ? ` · ${new Date(editingActivity.activity_date).toLocaleDateString("en-GB")}`
                      : ""}
                  </p>
                )}
                {!editingActivity && followUpDefaults?.client_name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {followUpDefaults.client_name} · pre-filled from previous call
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close activity form"
                className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ActivityForm
              key={editingActivity?.id ?? (followUpDefaults ? `follow-${followUpDefaults.client_name ?? ""}-${scrollTick}` : "new")}
              editingId={editingActivity?.id}
              defaultSalesPerson={userInfo?.salesperson ?? undefined}
              defaultValues={!editingActivity && followUpDefaults ? followUpDefaults : undefined}
              onSuccess={handleFormSuccess}
              onCancel={closeForm}
            />
          </div>
        )}

        {/* ── Progress + Quests ───────────────────────────── */}
        {me ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <ProgressCard me={me} />
            <QuestBoard me={me} />
          </div>
        ) : error && !data ? (
          <HubError message={error} onRetry={() => void refreshGame()} />
        ) : loading || !data ? (
          <HubSkeleton />
        ) : (
          <HubEmpty onLogActivity={openNewForm} />
        )}

        {/* ── Hub tabs ─────────────────────────────────────── */}
        <Tabs value={tab} onValueChange={(v) => { if (isHubTab(v)) setTab(v) }}>
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <TabsList className="h-auto gap-1 p-1">
              {TABS.map((t) => {
                const Icon = t.icon
                return (
                  <TabsTrigger key={t.value} value={t.value} className="gap-1.5 px-3 py-1.5">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {t.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="log" className="mt-3">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <List className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold">
                  {isAdmin ? "All activities" : "My activities"}
                </h2>
              </div>
              <ActivityList
                onEdit={(a) => {
                  setEditing(a)
                  setShowForm(false)
                  setFollowUpDefaults(null)
                  setScrollTick((v) => v + 1)
                }}
                onFollowUp={(a) => {
                  // Open a new blank form pre-filled with the same client data + WARM_CALL
                  setEditing(null)
                  setShowForm(true)
                  setFollowUpDefaults({
                    client_name:    a.client_name    ?? "",
                    contact_person: a.contact_person ?? "",
                    contact_number: a.contact_number ?? "",
                    email:          a.email          ?? "",
                    mode:           a.mode           ?? "",
                    pol:            a.pol            ?? "",
                    pod:            a.pod            ?? "",
                    branch:         a.branch         ?? "",
                    activity_type:  "WARM_CALL",
                  })
                  setScrollTick((v) => v + 1)
                }}
                refresh={refresh}
              />
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-3">
            {data ? (
              <Leaderboard board={data.board} isAdmin={data.isAdmin} />
            ) : (
              <PanelMessage title="Leaderboard" body={error ? "The leaderboard could not be loaded." : "Loading..."} />
            )}
          </TabsContent>

          <TabsContent value="trophies" className="mt-3">
            {data ? (
              <TrophyCabinet me={me} />
            ) : (
              <PanelMessage title="Trophies" body={error ? "Trophies could not be loaded." : "Loading..."} />
            )}
          </TabsContent>

          <TabsContent value="progression" className="mt-3">
            {data ? (
              <Progression me={me} />
            ) : (
              <PanelMessage title="Progression" body={error ? "Progression could not be loaded." : "Loading..."} />
            )}
          </TabsContent>

          <TabsContent value="arcade" className="mt-3">
            {me ? (
              <ArcadePanel me={me} />
            ) : (
              <PanelMessage title="Arcade" body={error ? "The arcade could not be loaded." : "Loading..."} />
            )}
          </TabsContent>

          <TabsContent value="hexagone" className="mt-3">
            {data ? (
              <Hexagone me={me} />
            ) : (
              <PanelMessage title="Hexagone" body={error ? "Hexagone could not be loaded." : "Loading..."} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MotionConfig>
  )
}

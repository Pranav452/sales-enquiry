"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ActivityForm } from "@/components/activities/ActivityForm"
import { ActivityList, type Activity } from "@/components/activities/ActivityList"
import { MyScorecard } from "@/components/activities/MyScorecard"
import { TeamLeaderboard } from "@/components/activities/TeamLeaderboard"
import { Button } from "@/components/ui/button"
import { Plus, X, Trophy, List, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACTIVITY_TYPE_MAP, type RankDef } from "@/lib/constants/activities"
import Confetti from "react-confetti"

interface UserInfo { role: string; salesperson: string | null }

function PointsToast({ points, type, onDone }: { points: number; type: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  const def = ACTIVITY_TYPE_MAP[type]

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border-2",
      "animate-in slide-in-from-bottom-4 fade-in",
      def?.color ?? "bg-green-100",
      def?.textColor ?? "text-green-700",
      def?.color ? `${def.color} border-current` : "border-green-400"
    )}>
      <div className="text-center">
        <p className="text-2xl font-black leading-tight">+{points} XP</p>
        <p className="text-xs font-medium opacity-80">Activity Logged</p>
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold">{def?.label ?? "Activity"}</p>
        <p className="text-xs opacity-70">{def?.description}</p>
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  const [userInfo, setUserInfo]         = useState<UserInfo | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [editingActivity, setEditing]   = useState<Activity | null>(null)
  const [followUpDefaults, setFollowUpDefaults] = useState<Record<string, string> | null>(null)
  const [refresh, setRefresh]           = useState(0)
  const [toast, setToast]               = useState<{ points: number; type: string } | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [tab, setTab]                   = useState<"list" | "leaderboard">("list")
  const [levelUp, setLevelUp]           = useState<RankDef | null>(null)
  const [winSize, setWinSize]           = useState({ width: 0, height: 0 })

  useEffect(() => {
    function update() { setWinSize({ width: window.innerWidth, height: window.innerHeight }) }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const handleLevelUp = useCallback((newRank: RankDef) => {
    setLevelUp(newRank)
    setTimeout(() => setLevelUp(null), 6000)
  }, [])

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

  function handleSuccess(id: string, points: number, isEdit: boolean) {
    setShowForm(false)
    setEditing(null)
    setRefresh((v) => v + 1)
    if (!isEdit) setToast({ points, type: "COLD_CALL" }) // will be overridden if we track type
  }

  function handleFormSuccess(id: string, points: number, isEdit: boolean, activityType?: string) {
    setShowForm(false)
    setEditing(null)
    setRefresh((v) => v + 1)
    if (!isEdit) setToast({ points, type: activityType ?? "COLD_CALL" })
  }

  const isAdmin = userInfo?.role === "admin"

  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Activity Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log calls and client visits — earn XP and climb the leaderboard
          </p>
        </div>
        {!showForm && !editingActivity && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Log Activity
          </Button>
        )}
      </div>

      {/* ── Log / Edit form ──────────────────────────────── */}
      {(showForm || editingActivity) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                {editingActivity ? "Edit Activity" : followUpDefaults ? "Log Follow-up Call" : "Log New Activity"}
              </h2>
              {editingActivity?.client_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingActivity.client_name}
                  {editingActivity.activity_date
                    ? ` · ${new Date(editingActivity.activity_date).toLocaleDateString("en-GB")}`
                    : ""}
                </p>
              )}
              {!editingActivity && followUpDefaults?.client_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {followUpDefaults.client_name} · pre-filled from previous call
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); setFollowUpDefaults(null) }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ActivityFormWithType
            editingId={editingActivity?.id}
            defaultSalesPerson={userInfo?.salesperson ?? undefined}
            defaultValues={!editingActivity && followUpDefaults ? followUpDefaults : undefined}
            onSuccess={(id, pts, isEdit, type) => {
              setFollowUpDefaults(null)
              handleFormSuccess(id, pts, isEdit, type)
            }}
            onCancel={() => { setShowForm(false); setEditing(null); setFollowUpDefaults(null) }}
          />
        </div>
      )}

      {/* ── My Scorecard ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            My Scorecard
          </p>
          <MyScorecard key={refresh} onLevelUp={handleLevelUp} />
        </div>

        {/* ── Leaderboard (right side on large, tab on mobile) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold">Team Leaderboard</span>
            </div>
            <button
              type="button"
              onClick={() => setShowLeaderboard((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showLeaderboard
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </button>
          </div>
          {showLeaderboard && (
            <TeamLeaderboard
              isAdmin={isAdmin}
              mySalesPerson={userInfo?.salesperson ?? undefined}
              refresh={refresh}
            />
          )}
        </div>
      </div>

      {/* ── Activity Log ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {isAdmin ? "All Activities" : "My Activities"}
          </span>
        </div>
        <ActivityList
          onEdit={(a) => {
            setEditing(a)
            setShowForm(false)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          onFollowUp={(a) => {
            // Open a new blank form pre-filled with same client data + WARM_CALL
            setEditing(null)
            setShowForm(true)
            // Store the prefill in state so ActivityFormWithType can pass it down
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
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          refresh={refresh}
        />
      </div>

      {/* ── XP toast ──────────────────────────────────────── */}
      {toast && (
        <PointsToast
          points={toast.points}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* ── Level-up confetti + banner ──────────────────────── */}
      {levelUp && (
        <>
          <Confetti
            width={winSize.width}
            height={winSize.height}
            numberOfPieces={350}
            recycle={false}
            gravity={0.18}
            style={{ position: "fixed", top: 0, left: 0, zIndex: 100 }}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
            <div className={cn(
              "pointer-events-auto mx-4 rounded-2xl border-2 shadow-2xl px-8 py-7 text-center max-w-sm w-full",
              levelUp.bg, levelUp.color
            )}>
              <p className={cn("text-4xl font-black mb-1", levelUp.text)}>
                {levelUp.rank.toUpperCase()}
              </p>
              <p className={cn("text-lg font-bold mb-2", levelUp.text)}>Rank Unlocked!</p>
              <p className="text-sm text-muted-foreground">
                Congratulations — you just leveled up to <strong>{levelUp.rank}</strong>!
              </p>
              <button
                type="button"
                onClick={() => setLevelUp(null)}
                className={cn(
                  "mt-5 px-5 py-2 rounded-lg text-sm font-semibold border-2 transition-colors",
                  levelUp.text, levelUp.color,
                  "hover:opacity-80"
                )}
              >
                Let&apos;s go!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Wrapper that tracks the activity type for the toast notification
function ActivityFormWithType({
  editingId,
  defaultSalesPerson,
  defaultValues,
  onSuccess,
  onCancel,
}: {
  editingId?:          string
  defaultSalesPerson?: string
  defaultValues?:      Record<string, string> | null
  onSuccess:           (id: string, points: number, isEdit: boolean, type?: string) => void
  onCancel?:           () => void
}) {
  const [selectedType, setSelectedType] = useState(defaultValues?.activity_type ?? "")

  return (
    <div onClick={(e) => {
      const btn = (e.target as HTMLElement).closest("button[data-type]")
      if (btn) setSelectedType(btn.getAttribute("data-type") ?? "")
    }}>
      <ActivityForm
        editingId={editingId}
        defaultSalesPerson={defaultSalesPerson}
        defaultValues={defaultValues ?? undefined}
        onSuccess={(id, pts, isEdit) => onSuccess(id, pts, isEdit, selectedType)}
        onCancel={onCancel}
      />
    </div>
  )
}

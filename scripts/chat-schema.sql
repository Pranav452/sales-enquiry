-- ═══════════════════════════════════════════════════════════════════════════
-- Chat module schema — run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE public.chat_rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('direct', 'group')),
  name       text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_members (
  room_id   uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE public.chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      text NOT NULL,
  mentions     uuid[] NOT NULL DEFAULT '{}',
  enquiry_refs text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_chat_members_user    ON public.chat_members(user_id);
CREATE INDEX idx_chat_messages_room   ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.chat_rooms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: breaks the RLS circular dependency between chat_rooms ↔ chat_members
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE room_id = p_room_id AND user_id = auth.uid()
  );
$$;

-- chat_rooms: only see rooms you belong to
CREATE POLICY "members_select_rooms"
  ON public.chat_rooms FOR SELECT
  USING (public.is_room_member(id));

-- chat_rooms: any authenticated user can create rooms
CREATE POLICY "auth_insert_rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- chat_members: see your own memberships + all members in your rooms
CREATE POLICY "members_select_members"
  ON public.chat_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_room_member(room_id));

-- chat_members: authenticated users can add members (API route controls logic)
CREATE POLICY "auth_insert_members"
  ON public.chat_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- chat_messages: only room members can read messages
CREATE POLICY "members_select_messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_room_member(room_id));

-- chat_messages: only room members can send messages (and only as themselves)
CREATE POLICY "members_insert_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.is_room_member(room_id));

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime on the messages table so the client receives live inserts.
-- You can also do this via: Supabase Dashboard → Database → Replication

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

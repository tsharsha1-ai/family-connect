

## Family Polls Feature — with Pinning & Timed Expiry

### Database Changes

**New table: `family_polls`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| family_id | uuid NOT NULL | |
| created_by | uuid NOT NULL | |
| question | text NOT NULL | |
| options | jsonb NOT NULL | array of strings |
| is_pinned | boolean | default false |
| is_active | boolean | default true |
| duration_hours | integer NOT NULL | set by creator (1h, 6h, 12h, 24h, 48h, 72h) |
| expires_at | timestamptz NOT NULL | computed: created_at + duration |
| created_at | timestamptz | default now() |

**New table: `poll_votes`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| poll_id | uuid NOT NULL | FK to family_polls |
| user_id | uuid NOT NULL | |
| selected_option | integer NOT NULL | index into options array |
| created_at | timestamptz | default now() |
| UNIQUE(poll_id, user_id) | | one vote per person |

**RLS Policies:**
- SELECT/INSERT polls: family members only (via `user_is_family_member`)
- UPDATE polls (pin/close): creator or admin only
- SELECT votes: family members; INSERT votes: own user_id + poll not expired
- Validation trigger: reject votes if `now() > expires_at`

### UI Changes

**1. Feed Page (`src/pages/FamilyFeed.tsx`)**
- Add a "Create Poll" floating button (or top-bar button)
- Show **pinned polls** at the very top in a highlighted card section, always visible
- Show **active (non-pinned) polls** below pinned ones, above the timeline
- Expired polls show results only (greyed out, labeled "Ended")
- Poll events (created, voted) appear in the timeline

**2. New: `src/components/CreatePollDialog.tsx`**
- Question text input
- 2–4 option inputs (add/remove)
- Duration picker: preset choices (1h, 6h, 12h, 24h, 48h, 72h)
- "Pin this poll" toggle switch
- Submit creates the poll with `expires_at = now() + duration`

**3. New: `src/components/PollCard.tsx`**
- Shows question, countdown timer ("2h 15m left"), pin icon if pinned
- Before voting: option buttons to tap
- After voting: horizontal bar chart with percentages and voter names
- Expired: "Poll ended" badge, results locked in
- Creator/admin: can toggle pin, can close early

### Key Behaviors
- **Pinned polls** stick to top of Feed regardless of creation time
- **Countdown** displays remaining time; auto-expires client-side (disable vote buttons when `expires_at` passed)
- **Duration** is chosen at creation, not editable after
- Only poll creator or family admin can pin/unpin or close early

### Files to Create/Modify
- **Migration**: Create `family_polls` and `poll_votes` tables with RLS + vote validation trigger
- **`src/components/CreatePollDialog.tsx`**: New — poll creation form
- **`src/components/PollCard.tsx`**: New — poll display, voting, results, countdown
- **`src/pages/FamilyFeed.tsx`**: Add polls section (pinned → active → timeline), create button, fetch polls/votes


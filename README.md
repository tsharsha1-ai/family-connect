# 🏠 Family Adda

**Your family's private digital veranda** — a warm, Indian-family-centric app where every member has their own corner, yet everyone stays connected under one roof.

---

## 🪷 Concept

"Adda" (আড্ডা) means a relaxed gathering spot for conversation. **Family Adda** reimagines this for the digital age — a single private space where grandparents share blessings, kids play games, siblings track cricket predictions, and everyone votes on weekend plans.

Each family gets a **private space** protected by a 6-digit access code. Members choose a **persona** (Chhotu 🪁, Bhaiya 🏏, Didi 🌸, Dada/Dadi 🪷) that personalises their experience across four themed zones.

---

## ✨ Features

### 🔐 Gatekeeper (Onboarding)
- **Create a Family** — name your family, get a shareable 6-digit code
- **Join with Code** — enter a family code to join an existing household
- **Persona Selection** — pick your role: Kid, Man, Woman, or Elder
- **Email/Password Auth** — secure sign-up and login

### 🏡 Home Hub
- Central dashboard showing family activity at a glance
- Quick navigation to all zones
- Family name and member overview

### 📰 Family Feed
- Shared activity stream for the whole family
- See what everyone's been up to across all zones

### 📅 Family Calendar
- Track **birthdays**, **anniversaries**, and **travel** plans
- Shared calendar visible to all family members
- Event reminders via push notifications

### 🗳️ Family Polls
- Create polls with custom options and expiry times
- Real-time voting — see results as they come in
- Pin important polls to the top

### 🏏 Arena Zone (Bhaiya's Corner)
- **IPL Match Predictions** — predict match winners before games start
- **Leaderboard** — family-wide prediction rankings with points
- Admin tools to manage matches and declare winners

### 🌸 Style Zone (Didi's Corner)
- **Style Circle** — share outfit photos with the family
- **Likes & Comments** — react to each other's posts
- Image upload with captions

### 🪷 Wisdom Well (Dada/Dadi's Corner)
- **Blessings Board** — elders share blessings, tag family members, and receive ❤️ likes
- **Devotional Songs** — share YouTube bhajan/kirtan links with the family; each song shows the sender's name and when it was shared

### 🪁 Kids Zone (Chhotu's Corner)
- **Whack-a-Mole** — fun mini-game with family leaderboard
- High scores tracked per family

### ⚙️ Settings
- View family access code (for inviting members)
- Manage push notification preferences
- Sign out

### 🔔 Push Notifications
- PWA-ready with service worker support
- Notifications for new family activity and upcoming events
- Per-user notification preferences

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Animations** | Framer Motion |
| **Data Fetching** | TanStack React Query |
| **Routing** | React Router v6 (lazy-loaded zones) |
| **Backend** | Lovable Cloud (Supabase) |
| **Auth** | Email/password with Row-Level Security |
| **PWA** | Service worker, web push notifications |

---

## 🏗️ Architecture

```
src/
├── components/       # Shared UI (AppHeader, BottomNav, PollCard, etc.)
├── contexts/         # AuthContext — manages user, family, memberships
├── pages/
│   ├── Gatekeeper    # Onboarding wizard
│   ├── HomeHub       # Dashboard
│   ├── FamilyFeed    # Activity stream
│   ├── FamilyCalendar# Events
│   ├── SettingsPage  # Preferences
│   └── zones/
│       ├── ArenaZone   # Cricket predictions
│       ├── StyleZone   # Photo sharing
│       ├── WisdomZone  # Blessings & devotional songs
│       └── KidsZone    # Mini-games
├── types/            # TypeScript interfaces (Family, Profile, etc.)
└── hooks/            # Custom hooks (push notifications, mobile detection)
```

### Multi-Family Support
A user can belong to **multiple families** (e.g., in-laws and parents). The `FamilyPicker` lets them switch context, and all data is scoped to the active family via RLS policies using `user_is_family_member(family_id)`.

### Security
- Every table uses **Row-Level Security** — users can only access data for families they belong to
- Family creation is open, but all content operations require authentication
- Admin actions (match management, poll pinning) are restricted to family admins

---

## 🚀 Getting Started

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd family-adda

# Install dependencies
npm install

# Start dev server
npm run dev
```

Or simply open the project in [Lovable](https://lovable.dev) and start prompting!

---

## 📱 PWA Install

Family Adda is a Progressive Web App. On mobile browsers, tap **"Add to Home Screen"** for a native app-like experience with push notifications.

---

*Built with ❤️ for Indian families, by Family Adda.*

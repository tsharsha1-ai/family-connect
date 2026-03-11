

## Diagnosis

Based on the evidence:
- **Network requests succeed** -- profile and family data return correctly (200 status with data)
- **Session replay confirms** the header renders with "Harsha" and "BGS family"  
- **The HomeHub zone cards are not appearing** despite the page loading past the auth gate

There are two issues to fix:

### Issue 1: RLS Policies are ALL RESTRICTIVE (critical)
Every RLS policy in the database has `Permissive: No`, meaning they are `RESTRICTIVE`. In PostgreSQL, restrictive policies require **at least one permissive policy** to grant access. Without a permissive policy, restrictive policies alone block everything. The current queries may succeed due to session caching, but this is fragile and will break on fresh loads.

**Fix:** Drop all restrictive policies and recreate them as `PERMISSIVE` (the default). This was attempted in a prior migration but clearly did not take effect.

### Issue 2: Layout overflow hiding content
The CSS sets `overflow: hidden` on `html, body, #root`. The AppShell uses `flex flex-col h-full`, but the `h-full` (100%) chain may break through the provider wrapper components (QueryClientProvider, TooltipProvider, etc.) that don't pass height. This can cause the HomeHub content to be clipped.

**Fix:** 
- Change `h-full` to `min-h-screen` on AppShell container
- Use `overflow-y-auto` instead of relying on parent height
- Change `overflow: hidden` to `overflow: auto` on `#root`

## Implementation Steps

1. **Database migration** -- Drop and recreate ALL RLS policies as PERMISSIVE (not RESTRICTIVE)
2. **Fix `src/index.css`** -- Change `overflow: hidden` to `overflow: auto` on `#root`
3. **Fix `src/components/AppShell.tsx`** -- Use `min-h-screen` instead of `h-full`, ensure content is scrollable
4. **Fix `src/pages/HomeHub.tsx`** -- Use `min-h-[calc(100vh-7.5rem)]` instead of inline style with fixed height
5. **Fix `src/pages/FamilyCalendar.tsx`** and `src/pages/SettingsPage.tsx` -- Same layout fix
6. **Add back button** to zone pages (KidsZone, ArenaZone, StyleZone, WisdomZone) for navigation back to dashboard


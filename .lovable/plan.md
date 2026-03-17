

## Plan: Add Shareable Devotional Songs with Sender Names

Currently the Devotional Songs section is local-only — a YouTube URL is pasted and played but never saved. This plan adds persistence so songs are shared with the family and show who shared them.

### Database
- Create a `devotional_songs` table with columns: `id`, `family_id`, `user_id`, `youtube_url`, `created_at`
- Add RLS policies for family members to read and authenticated users to insert
- Enable select for family members, insert for authenticated members

### WisdomZone.tsx Changes
1. Add a **Send** button next to the YouTube URL input (matching the blessing send button style)
2. Fetch saved songs from `devotional_songs` joined with `family_members` to resolve sender names
3. Display a feed of shared songs below the input, each showing the sender's display name, time ago, and an embedded YouTube player
4. Remove the local-only `videoUrl` state in favor of the persisted list
5. Use React Query for caching, consistent with the rest of the page

### UI Layout
- Input row: YouTube URL text field + Send button
- Below: list of shared songs, each card shows "Shared by {name} · {time}" with embedded player


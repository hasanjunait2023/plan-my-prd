

## Plan: Mind Journal — Trading Thoughts & Ideas Page (Web + Telegram Sync)

### তুমি যা চাও
একটা **Mind Journal** page যেখানে trading-related thoughts, ideas, screenshots store করবে। দুইভাবে entry হবে:
1. **Web UI** থেকে directly — text + image দিয়ে thought entry
2. **Telegram Group** থেকে — ছবি + caption পাঠালে auto-store হবে

**Bi-directional sync**: Telegram → Web DB, Web → Telegram group auto-post।

### Architecture

```text
Web UI (Mind Journal page)
    ↕ Supabase (mind_thoughts table + storage)
    ↕
Telegram Group ←→ mind-telegram-sync (Edge Function)
    ↑
pg_cron (every minute) → polls new messages from group
```

### Step 1: Database — `mind_thoughts` table

```sql
CREATE TABLE mind_thoughts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  source text NOT NULL DEFAULT 'web',  -- 'web' or 'telegram'
  telegram_message_id bigint,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  date text NOT NULL  -- YYYY-MM-DD for date grouping
);

CREATE INDEX idx_mind_thoughts_date ON mind_thoughts(date DESC);
CREATE INDEX idx_mind_thoughts_user ON mind_thoughts(user_id);
```
RLS: user_id based CRUD for authenticated users + service_role full access।

### Step 2: Storage Bucket — `mind-images`
ছবি store করার জন্য public bucket তৈরি করবো (journal screenshots pattern follow করবো)।

### Step 3: Mind Journal Page — `/mind-journal`
Trade Journal page এর **exact same layout pattern** follow করবো:

- **Left Sidebar**: Date-wise grouping (Month → Date collapsible), search bar
- **Middle Panel**: Selected date এর thoughts list (card format — text + image preview + timestamp)
- **Right Panel / Detail View**: Full thought view with image zoom
- **Top Bar**: "New Thought" button, filter options, export

**New Thought Form:**
- Text area (markdown support optional)
- Image upload (drag & drop)
- Tags input (optional — e.g., "setup", "lesson", "idea", "mistake")
- Save button → Supabase insert + auto Telegram post

### Step 4: Edge Function — `mind-telegram-sync/index.ts`
**Telegram → DB (Polling)**:
- pg_cron প্রতি মিনিটে call করবে
- Designated group/chat থেকে `getUpdates` poll করবে
- Photo + caption messages detect করবে
- Photo download → `mind-images` bucket এ upload
- Caption → `content` field, image URL → `image_url`
- `source: 'telegram'`, `telegram_message_id` save করবে (duplicate prevention)

**DB → Telegram (Auto-post)**:
- Web UI থেকে new thought save হলে, edge function call করবে
- Text + image Telegram group এ send করবে with date
- Format: `📝 Mind Journal — {date}\n\n{content}`

### Step 5: Settings Integration
Settings page এ **Mind Journal Telegram Group ID** input field যোগ করবো `alert_settings` table এ `mind_journal_chat_id` column হিসেবে।

### Step 6: Navigation
Nav config এ `/mind-journal` route যোগ করবো — Brain/Lightbulb icon সহ।

### Notification Format (Telegram Auto-post)

```
📝 Mind Journal — April 14, 2026

{thought content}

#MindJournal #TradingThoughts
```

### Files Changed
| File | Change |
|---|---|
| Migration | `mind_thoughts` table + storage bucket |
| `src/pages/MindJournal.tsx` | New page — journal-style layout |
| `src/components/mind/ThoughtCard.tsx` | Individual thought card component |
| `src/components/mind/ThoughtForm.tsx` | New thought entry form |
| `src/components/mind/MindSidebar.tsx` | Date-wise sidebar (NotebookSidebar pattern) |
| `src/components/mind/ThoughtDetail.tsx` | Full thought detail view |
| `src/hooks/useMindThoughts.ts` | CRUD hook for mind_thoughts table |
| `supabase/functions/mind-telegram-sync/index.ts` | Bi-directional Telegram sync |
| `src/App.tsx` | Route যোগ |
| `src/hooks/useNavConfig.ts` | Nav item যোগ |
| `src/pages/Settings.tsx` | Mind Journal chat ID field |
| Migration | `alert_settings` এ `mind_journal_chat_id` column |

### Result
- Web UI তে journal-style Mind Journal page পাবে — date-wise thoughts browse, search, filter
- Telegram group এ photo+caption দিলে auto-store হবে
- Web থেকে entry দিলে auto-post হবে Telegram group এ
- Tags দিয়ে thoughts categorize করা যাবে




## Plan: OpenClaw Agent × TradeVault Pro — Full Integration

### কি করা হবে
তোমার cloud-hosted OpenClaw agent কে TradeVault Pro এর সাথে connect করার জন্য একটা **secure REST API layer** তৈরি হবে। OpenClaw এর `web_fetch` tool ব্যবহার করে এই API call করবে, এবং একটা **SKILL.md** file agent কে শেখাবে কিভাবে TradeVault ব্যবহার করতে হয়।

### Architecture
```text
┌──────────────┐     web_fetch      ┌──────────────────────┐       ┌──────────┐
│  OpenClaw    │ ──────────────────► │  openclaw-api        │ ────► │ Supabase │
│  (Cloud)     │   Bearer API_KEY   │  (Edge Function)     │       │   DB     │
│  via Telegram│ ◄────────────────── │  /trades, /analytics │ ◄──── │          │
└──────────────┘     JSON response  └──────────────────────┘       └──────────┘
```

### API Endpoints (Single Edge Function — route-based)

| Route | Method | কি করে |
|-------|--------|--------|
| `/trades/list` | GET | সব trades দেখাবে (filter: date, pair, outcome) |
| `/trades/create` | POST | নতুন trade entry (chat থেকে: "EURUSD long 1.0850 SL 1.0820") |
| `/trades/stats` | GET | Today/week/month P&L, win rate, trade count |
| `/analytics/summary` | GET | Overall performance summary |
| `/analytics/pair` | GET | Pair-wise breakdown |
| `/psychology/log` | POST | Psychology log entry |
| `/psychology/today` | GET | আজকের psychology status |
| `/habits/status` | GET | Habit completion status |
| `/habits/complete` | POST | Habit mark as done |
| `/market/sessions` | GET | Active sessions, market open/close status |
| `/market/strength` | GET | Latest currency strength data |
| `/market/confluence` | GET | Top confluence pairs |
| `/account/balance` | GET | Account balance, equity, risk status |
| `/rules/list` | GET | Trading rules list |
| `/coaching/check` | GET | Proactive analysis — rule violations, pattern detection |

### Authentication & Security
- নতুন secret `OPENCLAW_API_KEY` — একটা random key generate করে set করা হবে
- Edge function এ `Authorization: Bearer <OPENCLAW_API_KEY>` check হবে
- Service role key দিয়ে DB access (user_id hardcode — single user app)

### OpenClaw SKILL.md
একটা skill file তৈরি হবে যেটা OpenClaw এর `~/.openclaw/skills/` folder এ রাখতে হবে:
- TradeVault API endpoints এর documentation
- Natural language → API mapping (e.g., "আজকের P&L কত?" → GET /trades/stats?period=today)
- Trade entry format parsing rules
- Proactive coaching prompts (কখন কি check করতে হবে)
- Cron suggestions (market open এ auto-check, daily summary)

### Proactive Coaching Logic
`/coaching/check` endpoint agent কে বলবে:
- "তুমি আজ 3টা trade নিয়েছো, max limit 3 — আর নেওয়া উচিত না"
- "এই সপ্তাহে London session এ 80% loss — সাবধান"
- "Last 5 trades এ FOMO emotion — break নাও"
- "Current drawdown 4.2% — max 5% limit কাছে"

### যা যা তৈরি হবে

| File | Purpose |
|------|---------|
| `supabase/functions/openclaw-api/index.ts` | Main API edge function — সব routes handle করবে |
| `/mnt/documents/TRADEVAULT_SKILL.md` | OpenClaw skill file — agent এর skills folder এ copy করতে হবে |

### DB Changes
- কোন নতুন table লাগবে না
- Existing tables (trades, psychology_logs, habits, currency_strength, confluence_scores, account_settings, trading_rules) থেকে read/write

### New Secret
- `OPENCLAW_API_KEY` — API authentication এর জন্য

### Setup Steps (তোমার জন্য)
1. Edge function deploy হবে automatically
2. `OPENCLAW_API_KEY` secret set করতে হবে
3. SKILL.md file download করে OpenClaw এর skills folder এ রাখতে হবে
4. OpenClaw config এ `web_fetch` tool allow করতে হবে (default এ আছে)
5. Telegram এ agent কে বলো: "TradeVault connect করো" — সে skill পড়ে automatically কাজ শুরু করবে


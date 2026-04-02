

## Plan: দুই Session এর Data আলাদা করে Realtime Update

### সমস্যা

1. **Edge function parser bug** (line 34): "Strength On New York" থেকে শুধু "York" নেয়, "New York" নেয় না
2. **New York workflow এ HTTP Request node নেই**: London workflow এ আছে (`Send a text message3 → HTTP Request`), কিন্তু New York workflow এ Telegram send এর পর শেষ হয়ে যায়

### যা করতে হবে

#### Step 1: Edge Function Fix
`supabase/functions/store-currency-strength/index.ts` — line 31-35 এর timeframe parser ঠিক করব:

```text
Current (bug):
  const tokens = raw.split(/\s+/);
  timeframe = tokens[tokens.length - 1];  // "New York" → "York" ❌

Fixed:
  timeframe = raw;  // "New York" → "New York" ✅
```

এতে London workflow "1H" পাঠাবে → timeframe = "1H", আর New York workflow "New York" পাঠাবে → timeframe = "New York"

#### Step 2: Edge Function Deploy
Fix করার পর deploy করব এবং test করব edge function ঠিকমতো "New York" timeframe parse করছে কিনা।

#### Step 3: n8n — New York Workflow এ HTTP Request Node (Manual)
n8n MCP দিয়ে node add করা যায় না, তাই আপনাকে manually করতে হবে:

1. **New York Session Co-relation** workflow open করুন
2. `Send a text message3` node এর **পরে** একটা **HTTP Request** node add করুন
3. Settings:
   - **Method**: `POST`
   - **URL**: `https://ejtnvpmshcqydndxxonq.supabase.co/functions/v1/store-currency-strength`
   - **Authentication**: None
   - **Headers**: 
     - `Authorization` = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdG52cG1zaGNxeWRuZHh4b25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzI0NTksImV4cCI6MjA5MDYwODQ1OX0.5iXpJuyIAKCKilGNzdaR635eVK43bw9khWyH1TnVwHo`
     - `Content-Type` = `application/json`
   - **Body**: JSON → `{ "text": "{{ $json.result.text }}" }`

#### UI — কিছু পরিবর্তন লাগবে না
- Currency Strength page এ ইতিমধ্যে "London" (`1H`) এবং "New York" tabs আছে
- Realtime subscription active — নতুন data insert হলেই auto-refetch হবে
- দুই workflow আলাদা timeframe দিয়ে data পাঠাবে, UI সেই অনুযায়ী সঠিক tab এ দেখাবে

---

### Technical Summary

| Change | File |
|--------|------|
| Fix timeframe parser — use full string after "On" | `supabase/functions/store-currency-strength/index.ts` |
| Deploy edge function | Auto |
| Add HTTP Request node | n8n (manual by user) |


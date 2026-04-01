

# OpenRouter দিয়ে Screenshot Analysis — Plan

## কি করতে হবে
বর্তমানে screenshot analysis Lovable AI Gateway ব্যবহার করে। এটা পরিবর্তন করে **OpenRouter API** ব্যবহার করবো, free vision models দিয়ে।

## OpenRouter Free Vision Models
- `google/gemini-2.0-flash-exp:free` — ভালো vision support, free
- `meta-llama/llama-4-maverick:free` — free, multimodal
- Fallback strategy: primary model fail করলে secondary try করবে

## Technical Changes

### Step 1: Secret Store
- `OPENROUTER_API_KEY` নামে Supabase secret হিসেবে store করবো (user কে নতুন key দিতে বলবো কারণ এটা leaked)

### Step 2: Edge Function Update
**File: `supabase/functions/analyze-trade-screenshot/index.ts`**

পরিবর্তন:
- API URL: `https://ai.gateway.lovable.dev/...` → `https://openrouter.ai/api/v1/chat/completions`
- Auth header: `LOVABLE_API_KEY` → `OPENROUTER_API_KEY`
- Model: `google/gemini-2.5-flash` → `google/gemini-2.0-flash-exp:free`
- Extra headers: `HTTP-Referer` এবং `X-Title` (OpenRouter requires)
- Fallback: primary model 429/error দিলে `meta-llama/llama-4-maverick:free` try করবে

### Step 3: Frontend — No Change
`ScreenshotAnalyzer.tsx` এ কোনো পরিবর্তন নেই — edge function invoke আগের মতোই থাকবে।

## Architecture

```text
ScreenshotAnalyzer.tsx
  → supabase.functions.invoke('analyze-trade-screenshot')
    → Edge Function
      → OpenRouter API (free model)
        → google/gemini-2.0-flash-exp:free (primary)
        → meta-llama/llama-4-maverick:free (fallback)
      → Extracted trade data JSON
    ← { data: ExtractedTradeData }
```

## Edge Function Changes Summary

```text
BEFORE                              AFTER
──────                              ─────
LOVABLE_API_KEY                     OPENROUTER_API_KEY
ai.gateway.lovable.dev/v1/...       openrouter.ai/api/v1/...
google/gemini-2.5-flash             google/gemini-2.0-flash-exp:free
No fallback                         Fallback to llama-4-maverick:free
```

Tool calling, system prompt, response parsing — সব একই থাকবে কারণ OpenRouter OpenAI-compatible API।


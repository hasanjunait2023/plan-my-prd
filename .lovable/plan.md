
User wants OpenAI API instead of Lovable AI for the coaching feature. Checking secrets — `OPENROUTER_API_KEY` exists but no `OPENAI_API_KEY`. Need to ask user to add it OR clarify if OpenRouter is acceptable.

Updating the plan to swap AI provider. Everything else stays the same.

---

# Plan: Daily Rules Adherence + AI Coaching System (OpenAI version)

Same architecture as approved before — only AI provider changes.

## Changes from previous plan
- `rules-coaching-plan` edge function will call **OpenAI API** (`https://api.openai.com/v1/chat/completions`) instead of Lovable AI Gateway
- Model: `gpt-4o-mini` (cheap, fast, great for analysis) — or `gpt-4o` if you want deeper reasoning
- Uses tool-calling for structured output (focus rules, action items, metrics)
- Needs new secret: **`OPENAI_API_KEY`**

## Everything else stays identical
- 3 tables: `daily_rule_adherence`, `rule_violations`, `coaching_plans`
- Daily Check-in tab (9:30 PM reminder)
- Adherence Report tab (heatmap + per-rule + patterns)
- Coaching tab with weekly plan card
- Auto-boost focus rules in Memorize Mode
- 2 new pg_cron jobs (9:30 PM check-in, Sunday 10 PM coaching)

## What I need from you

**OpenAI API key লাগবে** — `OPENAI_API_KEY` secret টা add করতে হবে।

কোথায় পাবে:
1. https://platform.openai.com/api-keys
2. "Create new secret key" → copy
3. Build শুরু করার আগে আমি secret add করার জন্য prompt দিব

## Open Questions

1. **Model choice**: 
   - `gpt-4o-mini` — cheap (~$0.15/1M tokens), fast, যথেষ্ট ভালো analysis (recommended)
   - `gpt-4o` — better reasoning, ~10x dam, deep insight
   - `gpt-5` — latest, best, dam beshi

2. **Check-in time**: 9:30 PM ঠিক আছে?

3. **Trade linking**: violated rule কে specific trade এর সাথে link করার option চাও? (default: skip)

Default: `gpt-4o-mini`, 9:30 PM, no trade linking।

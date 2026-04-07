

## Plan: Telegram Habit Reminder এ Yes/No Inline Button যোগ করা

### বর্তমান অবস্থা
এখন reminder এ text message যায় আর user কে `/done_<id>` type করে reply করতে হয়। এটা inconvenient।

### কি করা হবে
Telegram এর **Inline Keyboard Buttons** ব্যবহার করে প্রতিটি reminder এ ✅ Yes / ❌ No button দেখাবে। User click করলেই habit complete/skip হবে।

### Changes

| File | Change |
|------|--------|
| `supabase/functions/habit-reminder/index.ts` | `sendMessage` এ `reply_markup` যোগ — `inline_keyboard` with Yes (`done_<id>`) ও No (`skip_<id>`) button |
| `supabase/functions/habit-telegram-poll/index.ts` | `allowed_updates` এ `callback_query` যোগ। `update.callback_query` handle করা — `done_<id>` হলে habit complete, `skip_<id>` হলে ignore। Button click এর পরে `answerCallbackQuery` call করা। |

### Telegram Message Format (নতুন)

```text
⏰ Habit Reminder: "Morning Journal"
আজ এখনও complete করা হয়নি!

[✅ Done]  [❌ Skip]
```

### Technical Flow

```text
1. Reminder sends message with inline_keyboard buttons
2. User clicks "✅ Done" → Telegram sends callback_query with data "done_<habit_id>"
3. Poll function catches callback_query → inserts habit_log → updates streak
4. Calls answerCallbackQuery to remove loading state from button
5. Edits original message to show "✅ Completed!" confirmation
```

### Key API Details
- `reply_markup.inline_keyboard`: 2D array of button objects `[{text, callback_data}]`
- `callback_query.data`: contains `done_<id>` or `skip_<id>`
- `answerCallbackQuery`: confirms button press to Telegram
- `editMessageText`: updates original message after action

খুবই focused change — দুটো edge function update করলেই button system কাজ করবে।


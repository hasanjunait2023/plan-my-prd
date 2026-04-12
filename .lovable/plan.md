

## Plan: Fundamental Bias — Clean Table Layout

### বর্তমান সমস্যা
Card-row layout এ data গুলো scattered — currency, news, correlation, alignment সব মিশে যাচ্ছে। User দ্রুত scan করতে পারছে না।

### নতুন Table Structure

```text
┌──────────┬────────────┬───────────────┬───────────────────────────────────┬───────────┐
│ Currency │ Corr Score │ Corr Strength │ Fundamental Impact                │ Alignment │
├──────────┼────────────┼───────────────┼───────────────────────────────────┼───────────┤
│ 🇺🇸 USD  │ +6         │ ▲ Strong      │ NFP: 256K (F:180K P:212K) HIGH   │ ✅ Aligned │
│ 🇪🇺 EUR  │ -4         │ ▼ Weak        │ CPI: 2.1% (F:2.4% P:2.6%) HIGH  │ ✅ Aligned │
│ 🇬🇧 GBP  │ +5         │ ▲ Strong      │ GDP: 0.3% (F:0.3% P:0.1%) MED   │ ⚠️ Mixed  │
│ 🇯🇵 JPY  │ -2         │ ● Neutral     │ BOJ Rate: -0.1% (F:-0.1%) HIGH   │ — Neutral │
└──────────┴────────────┴───────────────┴───────────────────────────────────┴───────────┘
```

### Column বিবরণ

| Column | Data |
|--------|------|
| **Currency** | Flag + code (🇺🇸 USD) |
| **Corr Score** | Numeric value (+6, -4) — color coded: green=positive, red=negative |
| **Corr Strength** | Label (Very Strong / Strong / Mild Bull / Neutral / Mild Bear / Weak / Very Weak) with arrow icon & color |
| **Fundamental Impact** | Event name + Actual value (bold, colored) + Forecast & Previous (muted) + Impact badge (High/Medium) |
| **Alignment** | ✅ Aligned / ⚠️ Divergent / ● Mixed — comparing fundamental bias vs correlation direction |

### Technical Details

- **File**: `src/components/correlation/FundamentalBias.tsx` — full rewrite of content area
- shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` ব্যবহার হবে
- Card wrapper ও header (aligned counter, timestamp) যেমন আছে তেমনই থাকবে
- Sticky header, row hover effect, horizontal scroll on mobile
- কোনো নতুন file বা dependency লাগবে না

### ফলাফল
- এক নজরে ৮টি currency এর complete picture — correlation + fundamental + alignment
- প্রতিটি data point নিজ column এ isolated — verify করা সহজ
- "First graded currency" খুঁজে পেতে Alignment column এ ✅ Aligned দেখলেই হবে


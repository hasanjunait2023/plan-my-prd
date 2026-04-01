

# Dashboard এ নতুন Trading Metrics যোগ করা

## বর্তমানে যা আছে
Today's P&L, Win Rate, Profit Factor, Max Drawdown, Equity Curve, Weekly P&L, Win/Journal Streak, Rule of Day, Mental State, Last Trade।

## নতুন যা যোগ হবে

### Section 1: Performance Breakdown Cards (4-col grid)
- **Avg RRR (Risk-Reward)** — সব trade এর average RRR, ভালো নাকি improve দরকার বোঝা যাবে
- **Plan Adherence %** — কতগুলো trade plan অনুযায়ী হয়েছে, discipline measure
- **Best/Worst Pair** — কোন pair এ সবচেয়ে বেশি profit আর কোনটায় loss
- **Avg Confidence** — entry confidence level average, low মানে uncertain trades নিচ্ছো

### Section 2: Strategy Performance Table
- প্রতিটা strategy এর আলাদা Win Rate, Total P&L, Trade Count, Avg RRR
- কোন strategy কাজ করছে আর কোনটা করছে না — এক নজরে বোঝা যাবে

### Section 3: Session Performance Bar Chart
- Asian, London, New York, London Close — প্রতিটা session এর P&L bar chart
- কোন session এ তুমি ভালো perform করো সেটা visualize হবে

### Section 4: Mistake Frequency
- Common mistakes এর count — horizontal bar chart
- কোন mistake বারবার হচ্ছে সেটা identify করতে পারবে

### Section 5: Psychology Correlation Mini Card
- High mental state (7+) এ win rate vs Low mental state (<7) এ win rate
- Psychology আর performance এর link দেখাবে

## Changes

| Action | File |
|--------|------|
| **Modify** | `src/pages/Index.tsx` — উপরের 5টা section যোগ করবো existing content এর পরে |

1টা file change। সব data `mockData.ts` থেকেই আসবে — নতুন data file লাগবে না। Recharts দিয়ে charts হবে, existing Table component দিয়ে strategy table হবে।


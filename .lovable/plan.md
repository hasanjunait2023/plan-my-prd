

# TradeVault Pro — Phase 1 Foundation Plan

## Design System
- **Dark theme primary** with PRD color palette:
  - Background: `#0D1B2A` (Deep Navy), Cards: `#1A2B3C`
  - Primary Accent: `#00C9A7` (Teal/Emerald)
  - Profit: `#2ECC71`, Loss: `#E63946`, Warning: `#F39C12`
  - Text: `#ECF0F1` (primary), `#6B7E94` (secondary)
- Clean, data-dense UI with progressive disclosure
- Fully responsive (mobile-friendly dashboard & journal)

## Pages & Navigation
- **Sidebar navigation** with icons for all modules
- Pages: Dashboard, Trade Journal, New Trade, Analytics, Psychology, Settings

---

## Module 1: Dashboard / Home Screen
- Today's P&L widget (green/red color-coded)
- Weekly P&L progress bar
- Mini equity curve (monthly)
- Quick stats: Win Rate, Profit Factor, Max Drawdown
- Last trade summary card
- Win/Loss streak counter
- Journal streak counter
- "Rule of the Day" card (rotates from mock rules)
- Psychology state prompt

## Module 2: Trade Journal
- **List view** with sortable table: Date, Pair, Direction, P&L, RRR, Strategy, Outcome
- **Filters**: by pair, session, strategy, outcome, date range, psychology state
- **Full-text search** across trades
- **Trade detail page**: full entry with all fields from PRD (screenshots placeholder, pre/post trade notes, SMC tags, psychology state, plan adherence)
- Pinned/Starred trades
- Color-coded calendar timeline view (daily P&L)

## Module 3: New Trade Entry Form
- Comprehensive form matching all PRD fields
- Smart defaults & auto-calculations (Risk $, Risk %, RRR, P&L, Pips)
- Direction toggle (LONG/SHORT)
- Dropdowns for: Pair, Session, Timeframe, Strategy/Setup
- Multi-select for SMC tags & Mistakes
- Psychology state entry (rating + emotion tag)
- Plan adherence toggle + notes
- Rich text areas for Pre-Trade Reasoning & Post-Trade Review
- Screenshot upload placeholders
- Partial closes table

## Module 4: P&L & Portfolio Dashboard
- Equity curve line chart (Recharts)
- Monthly P&L bar chart
- Key metrics cards: Total P&L, Win Rate, Profit Factor, Avg Win/Loss, Best/Worst Trade, Streaks, Max Drawdown, Expectancy, Avg RRR
- Period selector (week/month/quarter/all-time)

## Module 5: Psychology Tracker
- Daily psychology log form: Mental State, Sleep Quality, Life Stress, Intention notes, Post-session reflection, Rule adherence
- Psychology score auto-calculation
- Weekly trend mini-chart
- Psychology vs P&L correlation display

## Module 6: Settings Page
- Account setup (starting balance, currency)
- Risk rules configuration (max risk %, daily loss limit, trade limits)
- Personal trading rules editor ("Rules I Never Break")

---

## Data Approach
- All data will use **mock/sample data** stored in local state
- Data models will match the PRD's database schema structure so backend integration later is seamless
- TypeScript interfaces for all entities (Trade, PsychologyLog, Account, etc.)

## Charts
- **Recharts** for equity curve, P&L bars, psychology trends, analytics charts




# Mobile Status Bar Color Fix

## সমস্যা
এখন `theme-color` সেট আছে `#00C9A7` (accent green), তাই Android এ status bar সবুজ দেখায় — চোখে লাগে।

## সমাধান
`theme-color` কে app এর dark background color (`#0D1B2A`) এ change করলেই status bar app এর সাথে blend হয়ে যাবে।

## Changes

| File | Change |
|------|--------|
| `index.html` | `<meta name="theme-color">` value `#00C9A7` → `#0D1B2A` |
| `public/manifest.json` | `theme_color` value `#00C9A7` → `#0D1B2A` |

মাত্র 2 লাইন change — status bar dark হয়ে regular মনে হবে।


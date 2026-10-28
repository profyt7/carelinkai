# HEX conversion table (OL-207)

Every hex colour literal in `src/**/*.{tsx,ts,css}` at the start of OL-207, with the decision taken.
CONVERT only where the value equals a brand/scale value **exactly** (tailwind.config.js) and it is UI chrome
(className / inline style / component CSS) — the rendered colour is unchanged. Everything else is KEEP with a reason.
Line numbers are as of commit `e4c372b9` (after the token commit, before the per-group conversion commits).

**Totals:** 797 literals — 134 CONVERT, 663 KEEP.

## Intentionally off-scale values (KEEP — no exact scale match; converting would change the colour)

| value | uses | note |
|---|---|---|
| `#6b7280` | 37 | Tailwind default gray-500; this repo's gray-500 is #63666A |
| `#10b981` | 12 |  |
| `#4f46e5` | 11 |  |
| `#f59e0b` | 10 |  |
| `#3b82f6` | 10 |  |
| `#3167d4` | 9 | hover shade next to #3978FC; NOT primary-600 (#2d60ca) |
| `#333` | 9 |  |
| `#b71c1c` | 9 |  |
| `#ef4444` | 8 |  |
| `#1f2937` | 8 |  |
| `#8b5cf6` | 6 |  |
| `#111` | 6 |  |
| `#16a34a` | 6 |  |
| `#ff6f00` | 6 |  |
| `#888` | 5 |  |
| `#2196f3` | 5 |  |
| `#0099e6` | 5 |  |
| `#0066cc` | 4 |  |
| `#666` | 4 |  |
| `#e3f2fd` | 4 |  |
| `#1976d2` | 4 |  |
| `#f44336` | 4 |  |
| `#d32f2f` | 4 |  |
| `#e8f5e9` | 4 |  |
| `#ffebee` | 4 |  |
| `#1b5e20` | 4 |  |
| `#06b6d4` | 3 |  |
| `#0d9488` | 3 |  |
| `#4caf50` | 3 |  |
| `#fff3e0` | 3 |  |
| `#ff9800` | 3 |  |
| `#0d47a1` | 3 |  |
| `#fff8e1` | 3 |  |
| `#43a047` | 3 |  |
| `#0288d1` | 3 |  |
| `#444` | 2 |  |
| `#ede7f6` | 2 |  |
| `#f3e5f5` | 2 |  |
| `#e0f2f1` | 2 |  |
| `#f1f8e9` | 2 |  |
| `#311b92` | 2 |  |
| `#e65100` | 2 |  |
| `#4a148c` | 2 |  |
| `#004d40` | 2 |  |
| `#33691e` | 2 |  |
| `#212121` | 2 |  |
| `#e1f5fe` | 2 |  |
| `#fafafa` | 2 |  |
| `#01579b` | 2 |  |
| `#673ab7` | 2 |  |
| `#9c27b0` | 2 |  |
| `#009688` | 2 |  |
| `#8bc34a` | 2 |  |
| `#dc2626` | 2 |  |
| `#000000` | 1 |  |
| `#fef3c7` | 1 |  |
| `#1a1a2e` | 1 |  |
| `#999` | 1 |  |
| `#2563eb` | 1 |  |
| `#60b5ff` | 1 |  |
| `#72bf78` | 1 |  |
| `#abc123` | 1 |  |
| `#404040` | 1 | AnimatedInput label rest colour |
| `#6366f1` | 1 |  |
| `#f0f9ff` | 1 |  |
| `#363636` | 1 |  |
| `#424242` | 1 |  |
| `#ffc107` | 1 |  |
| `#eab308` | 1 |  |
| `#22c55e` | 1 |  |
| `#14b8a6` | 1 |  |
| `#059669` | 1 |  |
| `#ec4899` | 1 |  |
| `#b45309` | 1 |  |
| `#fee2e2` | 1 |  |
| `#991b1b` | 1 |  |

## All literals

| file:line | value | decision | → token/class | reason |
|---|---|---|---|---|
| `src/app/admin/analytics/page.tsx:101` | `#3B82F6` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#10B981` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#F59E0B` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#EF4444` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#8B5CF6` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#EC4899` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#06B6D4` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:101` | `#84CC16` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:104` | `#10B981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:105` | `#F59E0B` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:106` | `#6B7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:107` | `#EF4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:108` | `#3B82F6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:109` | `#8B5CF6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:110` | `#06B6D4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:111` | `#10B981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:112` | `#6B7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:113` | `#9CA3AF` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/app/admin/analytics/page.tsx:114` | `#10B981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:417` | `#E5E7EB` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:418` | `#6B7280` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:419` | `#6B7280` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:421` | `#E5E7EB` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:426` | `#3B82F6` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:428` | `#3B82F6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:443` | `#E5E7EB` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:444` | `#6B7280` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:445` | `#6B7280` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:447` | `#E5E7EB` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:452` | `#8B5CF6` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:454` | `#8B5CF6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/analytics/page.tsx:563` | `#E5E7EB` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:564` | `#6B7280` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:569` | `#6B7280` | KEEP |  | SVG asset / illustration |
| `src/app/admin/analytics/page.tsx:573` | `#E5E7EB` | KEEP |  | chart / data-viz palette |
| `src/app/admin/analytics/page.tsx:575` | `#10B981` | KEEP |  | SVG asset / illustration |
| `src/app/admin/bug-reports/page.tsx:149` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/bug-reports/page.tsx:149` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/claim-resend/page.tsx:5` | `#727` | KEEP |  | comment / documentation |
| `src/app/admin/page.tsx:125` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/page.tsx:125` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/users/[id]/page.tsx:183` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:183` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/users/[id]/page.tsx:198` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:198` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/users/[id]/page.tsx:217` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:229` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:240` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:257` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:287` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/[id]/page.tsx:287` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/users/page.tsx:274` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:274` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/admin/users/page.tsx:304` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:313` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:328` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:358` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:358` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:386` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:386` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:413` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/admin/users/page.tsx:413` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/register/route.ts:469` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/register/route.ts:470` | `#0066cc` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/register/route.ts:474` | `#0066cc` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/register/route.ts:476` | `#0066cc` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/register/route.ts:478` | `#0066cc` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/register/route.ts:481` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/auth/setup-2fa/route.ts:102` | `#000000` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/auth/setup-2fa/route.ts:103` | `#ffffff` | KEEP |  | QR-code generation colour (not CSS) |
| `src/app/api/availability/ping/unsubscribe/route.ts:34` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/availability/ping/unsubscribe/route.ts:35` | `#0d9488` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/availability/ping/unsubscribe/route.ts:37` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/cron/credential-expiry/route.ts:96` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/cron/ride-reminders/route.ts:70` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:72` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:73` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:75` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:75` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/cron/ride-reminders/route.ts:91` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:92` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:93` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:94` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:95` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:97` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/cron/ride-reminders/route.ts:97` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/demo-request/route.ts:89` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:90` | `#666` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:92` | `#888` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:92` | `#111` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:93` | `#888` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:93` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:94` | `#888` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:94` | `#111` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:95` | `#888` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:95` | `#111` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:96` | `#888` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:96` | `#111` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:98` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/demo-request/route.ts:98` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:99` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/demo-request/route.ts:99` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/discharge-planner/placement-request/route.ts:137` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/discharge-planner/placement-request/route.ts:139` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/discharge-planner/placement-request/route.ts:140` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/discharge-planner/placement-request/route.ts:140` | `#e5e7eb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/discharge-planner/placement-request/route.ts:141` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/discharge-planner/placement-request/route.ts:142` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/discharge-planner/placement-request/route.ts:143` | `#f3f4f6` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/discharge-planner/placement-request/route.ts:143` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/discharge-planner/placement-request/route.ts:144` | `#fef3c7` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/discharge-planner/placement-request/route.ts:144` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/[id]/route.ts:323` | `#1a1a2e` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/[id]/route.ts:324` | `#444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/[id]/route.ts:325` | `#444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/[id]/route.ts:326` | `#666` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/[id]/route.ts:328` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/[id]/route.ts:328` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/marketplace/applications/[id]/route.ts:331` | `#999` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/route.ts:253` | `#2563eb` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/marketplace/applications/route.ts:253` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/marketplace/applications/route.ts:254` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/operator/residents/[id]/intake-pdf/route.ts:67` | `#1e40af` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/app/api/operator/residents/[id]/intake-pdf/route.ts:68` | `#3b82f6` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/app/api/operator/residents/[id]/intake-pdf/route.ts:69` | `#6b7280` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/app/api/operator/residents/[id]/intake-pdf/route.ts:70` | `#e5e7eb` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/app/api/operator/residents/[id]/intake-pdf/route.ts:94` | `#111827` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/app/api/outreach/unsubscribe/route.ts:45` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/outreach/unsubscribe/route.ts:46` | `#0d9488` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/outreach/unsubscribe/route.ts:48` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/[id]/complete/route.ts:61` | `#16a34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/complete/route.ts:64` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/complete/route.ts:65` | `#16a34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/complete/route.ts:65` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/[id]/confirm/route.ts:80` | `#111` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:81` | `#16a34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:82` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/[id]/confirm/route.ts:84` | `#e5e7eb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/[id]/confirm/route.ts:88` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:89` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:90` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:91` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:92` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:93` | `#e5e7eb` | KEEP |  | exact scale value but not UI chrome className/style/css — review |
| `src/app/api/rides/[id]/confirm/route.ts:95` | `#16a34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/[id]/confirm/route.ts:95` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/[id]/confirm/route.ts:98` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/route.ts:342` | `#111` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:343` | `#16a34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:343` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:344` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/route.ts:346` | `#e5e7eb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/route.ts:350` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:351` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:352` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:353` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:355` | `#16a34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:355` | `#4f46e5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/rides/route.ts:355` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/rides/route.ts:358` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/test-sentry-client-error/route.ts:37` | `#f5f5f5` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/test-sentry-client-error/route.ts:46` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:50` | `#e3f2fd` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:54` | `#2196f3` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:57` | `#2196f3` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:67` | `#1976d2` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:70` | `#f44336` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:73` | `#d32f2f` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:76` | `#4caf50` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:84` | `#f5f5f5` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/app/api/test-sentry-client-error/route.ts:109` | `#fff3e0` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/test-sentry-client-error/route.ts:109` | `#ff9800` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/api/webhooks/stripe/route.ts:581` | `#111` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:582` | `#16a34a` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:583` | `#fff` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:585` | `#e5e7eb` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:589` | `#6b7280` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:590` | `#6b7280` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:591` | `#6b7280` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:592` | `#6b7280` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:593` | `#6b7280` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:595` | `#16a34a` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:595` | `#fff` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/api/webhooks/stripe/route.ts:598` | `#9ca3af` | KEEP |  | third-party embed (Stripe/Leaflet/MapTiler/Cloudinary) |
| `src/app/auth/forgot-password/page.tsx:55` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:56` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:81` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:82` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:115` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:137` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:137` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:137` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:173` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:173` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:204` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:204` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/forgot-password/page.tsx:216` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/login/page.tsx:364` | `#4285F4` | KEEP |  | SVG asset / illustration |
| `src/app/auth/login/page.tsx:365` | `#34A853` | KEEP |  | SVG asset / illustration |
| `src/app/auth/login/page.tsx:366` | `#FBBC05` | KEEP |  | SVG asset / illustration |
| `src/app/auth/login/page.tsx:367` | `#EA4335` | KEEP |  | SVG asset / illustration |
| `src/app/auth/reset-password/page.tsx:109` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:128` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:128` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:149` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:149` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:161` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:162` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:192` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:258` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:286` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:286` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:286` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:322` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:322` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:337` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:338` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:362` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/auth/reset-password/page.tsx:374` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/calendar/page.tsx:540` | `#e3f2fd` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:541` | `#e8f5e9` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:542` | `#ede7f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:543` | `#fff3e0` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:544` | `#f3e5f5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:545` | `#ffebee` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:546` | `#e0f2f1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:547` | `#f1f8e9` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:549` | `#f5f5f5` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/app/calendar/page.tsx:554` | `#0d47a1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:555` | `#1b5e20` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:556` | `#311b92` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:557` | `#e65100` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:558` | `#4a148c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:559` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:560` | `#004d40` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:561` | `#33691e` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:563` | `#212121` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:568` | `#fff8e1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:569` | `#e8f5e9` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:570` | `#ffebee` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:571` | `#e1f5fe` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:572` | `#fafafa` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:573` | `#e1f5fe` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:575` | `#f5f5f5` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/app/calendar/page.tsx:580` | `#ff6f00` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:581` | `#1b5e20` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:582` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:583` | `#01579b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:584` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:585` | `#01579b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/calendar/page.tsx:587` | `#212121` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/dashboard/ClientDashboard.tsx:50` | `#26c777` | KEEP |  | chart / data-viz palette |
| `src/app/dashboard/ClientDashboard.tsx:51` | `#0099e6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/dashboard/ClientDashboard.tsx:52` | `#e6b400` | KEEP |  | chart / data-viz palette |
| `src/app/dashboard/ClientDashboard.tsx:53` | `#e92c2c` | KEEP |  | chart / data-viz palette |
| `src/app/dashboard/ClientDashboard.tsx:146` | `#0099e6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/dashboard/ClientDashboard.tsx:148` | `#0099e6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/dashboard/ClientDashboard.tsx:149` | `#fff` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/app/design-preview/DesignPreviewClient.tsx:51` | `#DDD8CE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:53` | `#F5F0E8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:54` | `#E2DCCE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:68` | `#E2DCCE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:77` | `#E2DCCE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:90` | `#FAFAF8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:92` | `#E8E2D8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:92` | `#FAFAF8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:100` | `#E2DCCE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:102` | `#E2DCCE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:120` | `#E8E2D8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:122` | `#EEE8DD` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:137` | `#E8E2D8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:138` | `#F0EBE2` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:142` | `#F5F0E8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:144` | `#FDFAF6` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:145` | `#E8F0FF` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:162` | `#E8F0FF` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:163` | `#E6F7EE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:164` | `#E8F0FF` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:166` | `#E2DCCE` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:166` | `#C8C0B0` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:166` | `#FDFAF6` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:495` | `#FAFAF8` | KEEP |  | Direction A/B/C preview file |
| `src/app/design-preview/DesignPreviewClient.tsx:495` | `#F5F0E8` | KEEP |  | Direction A/B/C preview file |
| `src/app/global-error.tsx:53` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/global-error.tsx:53` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/globals.css:10` | `#3978FC` | KEEP |  | comment / documentation |
| `src/app/globals.css:11` | `#e8f2ff` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:12` | `#c2dcff` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:13` | `#9bc6ff` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:14` | `#74b0ff` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:15` | `#4d9aff` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:16` | `#3978FC` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:17` | `#2d60ca` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:18` | `#214898` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:19` | `#163066` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:20` | `#0a1834` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:22` | `#7253B7` | KEEP |  | comment / documentation |
| `src/app/globals.css:23` | `#7253B7` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:24` | `#5b4292` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:27` | `#e6f9f1` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:28` | `#c0efd9` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:29` | `#99e5c0` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:30` | `#73dba8` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:31` | `#4dd18f` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:32` | `#26c777` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:33` | `#1fa05f` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:34` | `#177847` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:35` | `#0f5130` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:36` | `#082918` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:39` | `#fff8e6` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:40` | `#ffedb3` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:41` | `#ffe180` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:42` | `#ffd64d` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:43` | `#ffca1a` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:44` | `#e6b400` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:45` | `#b38900` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:46` | `#805f00` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:47` | `#4d3900` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:48` | `#1a1300` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:51` | `#fdebeb` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:52` | `#f9c5c5` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:53` | `#f59e9e` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:54` | `#f17878` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:55` | `#ed5252` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:56` | `#e92c2c` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:57` | `#ba2323` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:58` | `#8c1a1a` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:59` | `#5d1111` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:60` | `#2f0909` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:63` | `#f8fafc` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:64` | `#f1f5f9` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:65` | `#e2e8f0` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:66` | `#cbd5e1` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:67` | `#94a3b8` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:68` | `#64748b` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:69` | `#475569` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:70` | `#334155` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:71` | `#1e293b` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:72` | `#0f172a` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:78` | `#ffffff` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:79` | `#05101c` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:80` | `#FDFAF6` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:81` | `#F5F0E8` | KEEP |  | scale / token definition (source of truth) |
| `src/app/globals.css:409` | `#e2e8f0` | CONVERT | `var(--color-neutral-200)` | exact scale value in component CSS — same rendered colour |
| `src/app/layout.tsx:111` | `#3978FC` | KEEP |  | metadata / PWA theme colour |
| `src/app/layout.tsx:171` | `#3978FC` | KEEP |  | metadata / PWA icon colour |
| `src/app/layout.tsx:172` | `#3978FC` | KEEP |  | metadata / PWA theme colour |
| `src/app/operator/analytics/AnalyticsCharts.tsx:32` | `#26c777` | KEEP |  | chart / data-viz palette |
| `src/app/operator/analytics/AnalyticsCharts.tsx:32` | `#e2e8f0` | KEEP |  | chart / data-viz palette |
| `src/app/operator/analytics/AnalyticsCharts.tsx:43` | `#0099e6` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#60B5FF` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#FF9149` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#FF9898` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#FF90BB` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#FF6363` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#80D8C3` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#A19AD3` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:15` | `#72BF78` | KEEP |  | chart / data-viz palette |
| `src/app/operator/homes/[id]/analytics/page.tsx:241` | `#60B5FF` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:243` | `#60B5FF` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/operator/homes/[id]/analytics/page.tsx:259` | `#8884d8` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:308` | `#60B5FF` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:366` | `#72BF78` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:368` | `#72BF78` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/operator/homes/[id]/analytics/page.tsx:405` | `#FF9149` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:420` | `#8884d8` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:472` | `#FF6363` | KEEP |  | SVG asset / illustration |
| `src/app/operator/homes/[id]/analytics/page.tsx:493` | `#A19AD3` | KEEP |  | SVG asset / illustration |
| `src/app/privacy/page.tsx:20` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:25` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:37` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:38` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:60` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:73` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:109` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:129` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:152` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:170` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:197` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:203` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:222` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:235` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:247` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:260` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:273` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:290` | `#7253B7` | CONVERT | `var(--color-secondary-500)` | exact scale value passed to an inline style (SmsProgramSection accent) — same colour |
| `src/app/privacy/page.tsx:294` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:307` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:322` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:334` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:334` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:340` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/privacy/page.tsx:340` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/providers.tsx:370` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/providers.tsx:371` | `#fff` | KEEP |  | third-party component config (react-hot-toast) |
| `src/app/settings/provider/credentials/page.tsx:328` | `#ABC123` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/app/terms/page.tsx:21` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:26` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:38` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:39` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:53` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:66` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:85` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:107` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:128` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:148` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:153` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:161` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:174` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:186` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:204` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:218` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:231` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:245` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:258` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:272` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:302` | `#3978FC` | CONVERT | `var(--color-primary-500)` | exact scale value passed to an inline style (SmsProgramSection accent) — same colour |
| `src/app/terms/page.tsx:306` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:328` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:328` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:334` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/app/terms/page.tsx:334` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/ErrorBoundary.tsx:74` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/ErrorBoundary.tsx:74` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:63` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:63` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:111` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:111` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:127` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:127` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:143` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:143` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:155` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:155` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:164` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/analytics/CookieConsent.tsx:164` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/animations/AnimatedButton.tsx:20` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedButton.tsx:20` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedButton.tsx:21` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedButton.tsx:21` | `#3167d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/animations/AnimatedButton.tsx:23` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedButton.tsx:55` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedInput.tsx:35` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedInput.tsx:35` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/animations/AnimatedInput.tsx:78` | `#3978FC` | KEEP |  | framer-motion animated value (needs a literal to interpolate) |
| `src/components/animations/AnimatedInput.tsx:78` | `#404040` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/animations/AnimatedInput.tsx:90` | `#3978FC` | KEEP |  | framer-motion animated value (needs a literal to interpolate) |
| `src/components/animations/AnimatedInput.tsx:90` | `#9ca3af` | KEEP |  | framer-motion animated value (needs a literal to interpolate) |
| `src/components/animations/LoadingSpinner.tsx:18` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/billing/DepositModal.tsx:230` | `#6366f1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:694` | `#2196f3` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:695` | `#4caf50` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:696` | `#673ab7` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:697` | `#ff9800` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:698` | `#9c27b0` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:699` | `#f44336` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:700` | `#009688` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:701` | `#8bc34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:706` | `#ff6f00` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:707` | `#43a047` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:708` | `#d32f2f` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:709` | `#1976d2` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:710` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:711` | `#0288d1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1541` | `#e8f5e9` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1542` | `#ffebee` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1542` | `#fff8e1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1543` | `#1b5e20` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1544` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1544` | `#ff6f00` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1718` | `#ff6f00` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1719` | `#43a047` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1720` | `#d32f2f` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1721` | `#1976d2` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1722` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1723` | `#0288d1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/calendar/CalendarView.tsx:1726` | `#9e9e9e` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/components/dashboard/ConversionFunnelChart.tsx:13` | `#60B5FF` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:13` | `#FF9149` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:13` | `#FF9898` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:13` | `#FF90BB` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:13` | `#FF6363` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:13` | `#80D8C3` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:39` | `#e5e7eb` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:42` | `#6b7280` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:49` | `#6b7280` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:56` | `#ffffff` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/ConversionFunnelChart.tsx:57` | `#e5e7eb` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:14` | `#80D8C3` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:15` | `#60B5FF` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:16` | `#FF9149` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:17` | `#FF6363` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:49` | `#8884d8` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:54` | `#60B5FF` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:59` | `#ffffff` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/IncidentDistributionChart.tsx:60` | `#e5e7eb` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:34` | `#e5e7eb` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:37` | `#6b7280` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:42` | `#6b7280` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:49` | `#ffffff` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:50` | `#e5e7eb` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:60` | `#0099e6` | KEEP |  | chart / data-viz palette |
| `src/components/dashboard/OccupancyTrendChart.tsx:62` | `#0099e6` | KEEP |  | chart / data-viz palette |
| `src/components/email/EmailDemo.tsx:97` | `#e2e8f0` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/components/email/EmailDemo.tsx:98` | `#3b82f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/components/email/EmailDemo.tsx:101` | `#f3f4f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/components/email/EmailDemo.tsx:107` | `#3b82f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/components/email/EmailDemo.tsx:108` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/components/inquiries/RealTimeInquiryUpdates.tsx:627` | `#f0f9ff` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/inquiries/RealTimeInquiryUpdates.tsx:628` | `#ffffff` | KEEP |  | framer-motion animated value (needs a literal to interpolate) |
| `src/components/onboarding/EmptyState.tsx:36` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/EmptyState.tsx:36` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/EmptyState.tsx:43` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/EmptyState.tsx:43` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/OnboardingModal.tsx:188` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/OnboardingModal.tsx:188` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/OnboardingModal.tsx:221` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/OnboardingModal.tsx:223` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/OnboardingModal.tsx:251` | `#3978FC` | CONVERT | `primary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/onboarding/OnboardingModal.tsx:251` | `#7253B7` | CONVERT | `secondary-500` | exact scale value, UI chrome className — same rendered colour |
| `src/components/operator/caregivers/CaregiverAnalytics.tsx:103` | `#8884d8` | KEEP |  | SVG asset / illustration |
| `src/components/operator/caregivers/CaregiverAnalytics.tsx:135` | `#3b82f6` | KEEP |  | SVG asset / illustration |
| `src/components/operator/caregivers/CaregiverAnalytics.tsx:159` | `#8b5cf6` | KEEP |  | SVG asset / illustration |
| `src/components/operator/inquiries/InquiryAnalytics.tsx:70` | `#3b82f6` | KEEP |  | SVG asset / illustration |
| `src/components/operator/inquiries/InquiryAnalytics.tsx:112` | `#3b82f6` | KEEP |  | SVG asset / illustration |
| `src/components/operator/inquiries/InquiryAnalytics.tsx:113` | `#10b981` | KEEP |  | SVG asset / illustration |
| `src/components/operator/residents/ResidentAnalytics.tsx:97` | `#3b82f6` | KEEP |  | SVG asset / illustration |
| `src/components/operator/residents/ResidentAnalytics.tsx:113` | `#3b82f6` | KEEP |  | SVG asset / illustration |
| `src/components/search/InteractiveMap.tsx:61` | `#dc2626` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/search/InteractiveMap.tsx:61` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/search/SimpleMap.tsx:102` | `#dc2626` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/search/SimpleMap.tsx:102` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/site/brand.ts:4` | `#3978FC` | KEEP |  | comment / documentation |
| `src/components/site/brand.ts:4` | `#7253B7` | KEEP |  | comment / documentation |
| `src/components/site/brand.ts:5` | `#2d60ca` | KEEP |  | comment / documentation |
| `src/components/ui/toast-provider.tsx:18` | `#363636` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/ui/toast-provider.tsx:19` | `#fff` | KEEP |  | third-party component config (react-hot-toast) |
| `src/components/ui/toast-provider.tsx:27` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/ui/toast-provider.tsx:28` | `#fff` | KEEP |  | third-party component config (react-hot-toast) |
| `src/components/ui/toast-provider.tsx:35` | `#ef4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/ui/toast-provider.tsx:36` | `#fff` | KEEP |  | third-party component config (react-hot-toast) |
| `src/components/ui/toast-provider.tsx:42` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/components/ui/toast-provider.tsx:43` | `#fff` | KEEP |  | third-party component config (react-hot-toast) |
| `src/hooks/useCalendar.ts:155` | `#e3f2fd` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:156` | `#2196f3` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:157` | `#0d47a1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:162` | `#e3f2fd` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:163` | `#2196f3` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:164` | `#0d47a1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:167` | `#e8f5e9` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:168` | `#4caf50` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:169` | `#1b5e20` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:172` | `#ede7f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:173` | `#673ab7` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:174` | `#311b92` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:177` | `#fff3e0` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:178` | `#ff9800` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:179` | `#e65100` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:182` | `#f3e5f5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:183` | `#9c27b0` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:184` | `#4a148c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:187` | `#ffebee` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:188` | `#f44336` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:189` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:192` | `#e0f2f1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:193` | `#009688` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:194` | `#004d40` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:197` | `#f1f8e9` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:198` | `#8bc34a` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:199` | `#33691e` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:205` | `#f5f5f5` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/hooks/useCalendar.ts:206` | `#9e9e9e` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/hooks/useCalendar.ts:207` | `#424242` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:209` | `#fff8e1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:210` | `#ffc107` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:211` | `#ff6f00` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:213` | `#fafafa` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:214` | `#f44336` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:215` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:883` | `#ff6f00` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:884` | `#43a047` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:885` | `#d32f2f` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:886` | `#1976d2` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:887` | `#b71c1c` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:888` | `#0288d1` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/hooks/useCalendar.ts:891` | `#9e9e9e` | KEEP |  | calendar / chart status palette (data-viz) |
| `src/lib/availability/ping.ts:131` | `#3978FC` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/availability/ping.ts:131` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/availability/ping.ts:136` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/availability/ping.ts:139` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/availability/ping.ts:140` | `#d1d5db` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/availability/ping.ts:140` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/availability/ping.ts:141` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/availability/ping.ts:142` | `#e5e7eb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/availability/ping.ts:143` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/availability/ping.ts:145` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/availability/ping.ts:146` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/caregiver-analytics.ts:76` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/caregiver-analytics.ts:77` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/caregiver-analytics.ts:78` | `#ef4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/claim-engine/resend-list.ts:2` | `#727` | KEEP |  | comment / documentation |
| `src/lib/claim-engine/resend-list.ts:5` | `#727` | KEEP |  | comment / documentation |
| `src/lib/concierge/facility-response.ts:192` | `#1f2937` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/concierge/facility-response.ts:196` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/concierge/facility-response.ts:198` | `#0d9488` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/concierge/facility-response.ts:198` | `#fff` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/concierge/facility-response.ts:199` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/concierge/facility-response.ts:200` | `#e5e7eb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/concierge/facility-response.ts:201` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/concierge/facility-response.ts:203` | `#9ca3af` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/dashboard-data.ts:204` | `#26c777` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/dashboard-data.ts:205` | `#0099e6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/dashboard-data.ts:206` | `#e6b400` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/dashboard-data.ts:207` | `#e92c2c` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/email-templates.ts:25` | `#0066cc` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email-templates.ts:26` | `#6c757d` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email-templates.ts:27` | `#28a745` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email-templates.ts:28` | `#f8f9fa` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email-templates.ts:29` | `#343a40` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email-templates.ts:30` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email-templates.ts:31` | `#e9ecef` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:87` | `#3978FC` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:152` | `#3978FC` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:309` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:359` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:411` | `#0d9488` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:411` | `#fff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:412` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:477` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:541` | `#1f2937` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:544` | `#0d9488` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:544` | `#fff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:545` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:604` | `#1f2937` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:606` | `#0d9488` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:606` | `#fff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:607` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:689` | `#1f2937` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:691` | `#0d9488` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:691` | `#fff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:692` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:693` | `#e5e7eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:694` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:696` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:744` | `#3978FC` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:750` | `#374151` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:751` | `#111827` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:754` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:764` | `#1f2937` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:767` | `#e5e7eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:768` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:770` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:918` | `#0d9488` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:918` | `#fff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:923` | `#1f2937` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:927` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:928` | `#e5e7eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:929` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:931` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:986` | `#333` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:987` | `#f5f5f5` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:994` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1000` | `#3b82f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1000` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1005` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1014` | `#1f2937` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1020` | `#4b5563` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1030` | `#3b82f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1030` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1031` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1045` | `#f3f4f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1046` | `#3b82f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1054` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1057` | `#f9fafb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1060` | `#e5e7eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1065` | `#6b7280` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1068` | `#3b82f6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1074` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1225` | `#0d9488` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1225` | `#fff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email.ts:1226` | `#9ca3af` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:75` | `#333` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:76` | `#f8f9fa` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:77` | `#2c3e50` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:78` | `#7f8c8d` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:81` | `#e0e0e0` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:86` | `#e0e0e0` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:88` | `#7f8c8d` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:92` | `#3498db` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:95` | `#95a5a6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/inquiry-email-service.ts:101` | `#95a5a6` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:62` | `#f7f7f7` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:63` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:65` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:65` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:71` | `#111111` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:76` | `#fafafa` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:76` | `#777777` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:150` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:150` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:175` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:175` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:204` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:204` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:264` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:264` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:294` | `#2563eb` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/email/transactional.ts:294` | `#ffffff` | KEEP |  | email / Resend payload (email clients need literal colours) |
| `src/lib/imageBlur.ts:6` | `#f3f4f6` | KEEP |  | SVG asset / illustration |
| `src/lib/imageBlur.ts:7` | `#e5e7eb` | KEEP |  | SVG asset / illustration |
| `src/lib/imageBlur.ts:8` | `#f3f4f6` | KEEP |  | SVG asset / illustration |
| `src/lib/imageBlur.ts:11` | `#f3f4f6` | KEEP |  | SVG asset / illustration |
| `src/lib/inquiry-analytics.ts:71` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:72` | `#8b5cf6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:73` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:74` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:75` | `#06b6d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:76` | `#eab308` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:77` | `#22c55e` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:78` | `#14b8a6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:79` | `#059669` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:80` | `#ef4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:84` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:85` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:86` | `#8b5cf6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:87` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:88` | `#ec4899` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:89` | `#06b6d4` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:90` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:94` | `#ef4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:95` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:96` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:97` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:187` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:201` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/inquiry-analytics.ts:214` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/leads/inbound-alerts.ts:120` | `#b45309` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/leads/inbound-alerts.ts:121` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/leads/web-inquiry-lead.ts:135` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/leads/web-inquiry-lead.ts:152` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:134` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:136` | `#4F46E5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:137` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/notifications/tour-notifications.ts:139` | `#4F46E5` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:141` | `#666` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:193` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:195` | `#10B981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:196` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/notifications/tour-notifications.ts:198` | `#10B981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:200` | `#666` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:248` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:250` | `#F59E0B` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:251` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/notifications/tour-notifications.ts:253` | `#F59E0B` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:293` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:295` | `#EF4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:296` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/notifications/tour-notifications.ts:297` | `#FEE2E2` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:297` | `#991B1B` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:298` | `#EF4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:333` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:335` | `#6B7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:336` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/notifications/tour-notifications.ts:365` | `#333` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:367` | `#8B5CF6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/notifications/tour-notifications.ts:368` | `#f9fafb` | KEEP |  | email / server-rendered HTML string (no Tailwind or CSS vars there) |
| `src/lib/resident-analytics.ts:53` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:54` | `#3b82f6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:55` | `#8b5cf6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:56` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:60` | `#10b981` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:61` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:62` | `#f59e0b` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:63` | `#ef4444` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:113` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/resident-analytics.ts:130` | `#6b7280` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/seo/og-image.tsx:6` | `#3978FC` | KEEP |  | comment / documentation |
| `src/lib/seo/og-image.tsx:6` | `#7253B7` | KEEP |  | comment / documentation |
| `src/lib/seo/og-image.tsx:34` | `#3978FC` | KEEP |  | OG/Twitter/icon image generation |
| `src/lib/seo/og-image.tsx:34` | `#7253B7` | KEEP |  | OG/Twitter/icon image generation |
| `src/lib/two-factor.ts:59` | `#0099e6` | KEEP |  | off-scale value (no exact scale/brand match) |
| `src/lib/two-factor.ts:60` | `#ffffff` | KEEP |  | QR-code generation colour (not CSS) |
| `src/lib/utils/pdf-generator.ts:33` | `#1e40af` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:39` | `#3b82f6` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:49` | `#666666` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:58` | `#1e40af` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:70` | `#666666` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:73` | `#1e40af` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:92` | `#1e40af` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:104` | `#3b82f6` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:104` | `#3b82f6` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:107` | `#ffffff` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:128` | `#f9fafb` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:128` | `#ffffff` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:131` | `#e5e7eb` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:135` | `#333333` | KEEP |  | PDF generation (renders outside the CSS theme) |
| `src/lib/utils/pdf-generator.ts:159` | `#666666` | KEEP |  | PDF generation (renders outside the CSS theme) |

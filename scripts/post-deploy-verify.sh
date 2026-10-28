#!/usr/bin/env bash
# OL-159 / OL-169 — post-deploy purge + verify for the public hub pages.
#
#   BASE=https://getcarelinkai.com EXPECT_SHA=<40-hex> CRON_SECRET=… scripts/post-deploy-verify.sh
#   DRY_RUN=1 BASE=http://localhost:3000 scripts/post-deploy-verify.sh      # verify only, no purge
#
# Steps
#   1. wait until /api/version serves EXPECT_SHA and keeps serving it for
#      STABLE_HITS consecutive polls (a Render rollover briefly answers from
#      both the old and the new instance — OL-169 root cause);
#      with no EXPECT_SHA (dry run / PR preview) the live sha is the target;
#   2. POST /api/admin/revalidate (skipped in DRY_RUN) and require the purged
#      list to contain "/" and every /cleveland/* page;
#   3. GET every hub page ("/" and every /cleveland/* page, from that list or
#      the built-in fallback) and assert the footer build sha "@<7-hex>"
#      equals the target, retrying each page for up to PAGE_WAIT_SECS and
#      re-purging once halfway through; /cleveland/assisted-living must also
#      render the Medicaid-waiver lines.
# The pages verified are emitted as one ::notice:: (GitHub keeps 10 annotations
# per step) so the result is readable from the check run without the job log. Secrets are never echoed.

set -u +e +o pipefail

BASE="${BASE:-https://getcarelinkai.com}"
EXPECT_SHA="${EXPECT_SHA:-}"
DRY_RUN="${DRY_RUN:-0}"
CRON_SECRET="${CRON_SECRET:-}"
DEPLOY_WAIT_SECS="${DEPLOY_WAIT_SECS:-1500}"
STABLE_HITS="${STABLE_HITS:-3}"
PAGE_WAIT_SECS="${PAGE_WAIT_SECS:-300}"
POLL_SECS="${POLL_SECS:-15}"
UA='CareLinkAI-PostDeploy/1.1'
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"

FAIL=0
fail() { echo "::error::$1"; echo "- ❌ $1" >> "$SUMMARY"; FAIL=1; }
pass() { echo "OK: $1"; echo "- ✅ $1" >> "$SUMMARY"; }
note() { echo "::notice::$1"; echo "- ℹ️ $1" >> "$SUMMARY"; }

live_sha() { curl -s -m 30 -H 'Cache-Control: no-cache' "$BASE/api/version" | grep -o '"commitSha":"[0-9a-f]*"' | cut -d'"' -f4; }
page_sha() { curl -s -m 40 -A "$UA" -H 'Cache-Control: no-cache' "$1?v=$(date +%s)" | grep -oE '@[0-9a-f]{7}' | head -n1 | tr -d '@'; }

purge() {
  resp=$(curl -s -m 40 -X POST -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' -d '{}' -w '\n%{http_code}' "$BASE/api/admin/revalidate" || printf '\n000')
  PURGE_CODE=$(printf '%s' "$resp" | tail -n1); PURGE_BODY=$(printf '%s' "$resp" | sed '$d')
  echo "POST /api/admin/revalidate → HTTP $PURGE_CODE ${PURGE_BODY:0:600}"
}

echo "## Post-deploy revalidate — $BASE (dry_run=$DRY_RUN)" >> "$SUMMARY"

# ---- 1. deploy wait --------------------------------------------------------
target=""
if [ -n "$EXPECT_SHA" ]; then
  short="${EXPECT_SHA:0:7}"
  deadline=$(( $(date +%s) + DEPLOY_WAIT_SECS )); hits=0
  while :; do
    live=$(live_sha)
    echo "$(date -u +%H:%M:%S) /api/version commitSha=${live:-?} (stable hits: $hits/$STABLE_HITS)"
    case "${live:-}" in "$short"*) hits=$((hits + 1)) ;; *) hits=0 ;; esac
    if [ "$hits" -ge "$STABLE_HITS" ]; then pass "live commit ${live:0:7} = expected $short (stable for $STABLE_HITS polls)"; break; fi
    if [ "$(date +%s)" -ge "$deadline" ]; then fail "commit $short not (stably) live after ${DEPLOY_WAIT_SECS}s (last seen ${live:-?})"; exit 1; fi
    sleep "$POLL_SECS"
  done
  target="$short"
else
  live=$(live_sha)
  if [ -z "$live" ]; then fail "/api/version gave no commitSha at $BASE"; exit 1; fi
  target="${live:0:7}"
  note "no EXPECT_SHA — verifying against the live commit $target"
fi

# ---- 2. purge --------------------------------------------------------------
# Fallback page list when the purge response is unavailable (dry run): the
# hub pages from src/lib/seo/revalidate-paths.ts minus llms.txt / sitemap.
FALLBACK_PAGES='/ /cleveland /cleveland/assisted-living /cleveland/assisted-living/westlake /cleveland/assisted-living/strongsville /cleveland/assisted-living/parma /cleveland/assisted-living/beachwood /cleveland/assisted-living/lakewood /cleveland/assisted-living/mentor /cleveland/assisted-living/cuyahoga-falls /cleveland/assisted-living/rocky-river /cleveland/assisted-living/medina /cleveland/assisted-living/hudson /cleveland/assisted-living/north-olmsted /cleveland/assisted-living/avon /cleveland/assisted-living/twinsburg /cleveland/assisted-living/chardon /cleveland/assisted-living/stow /cleveland/assisted-living/lyndhurst /cleveland/assisted-living/mayfield-heights /cleveland/assisted-living/shaker-heights /cleveland/assisted-living/euclid /cleveland/assisted-living/solon /cleveland/memory-care /cleveland/independent-living /cleveland/nursing-homes /cleveland/home-care-agencies /concierge'
PAGES="$FALLBACK_PAGES"
if [ "$DRY_RUN" = "1" ]; then
  note "dry run — purge skipped; checking the built-in hub list"
else
  purge
  case "$PURGE_CODE" in
    2??) pass "revalidate → $PURGE_CODE" ;;
    401|403) fail "revalidate: auth $PURGE_CODE — CRON_SECRET mismatch (repository secret ≠ Render's CRON_SECRET, or Render's is unset)" ;;
    5??) fail "revalidate: $PURGE_CODE — app error (5xx). Body: ${PURGE_BODY:0:300}" ;;
    *) fail "revalidate: HTTP $PURGE_CODE. Body: ${PURGE_BODY:0:300}" ;;
  esac
  purged=$(printf '%s' "$PURGE_BODY" | grep -o '"revalidated":\[[^]]*\]' | grep -oE '"/[^"]*"' | tr -d '"')
  if [ -n "$purged" ]; then
    PAGES=$(printf '%s\n' "$purged" | grep -vE '\.(txt|xml)$' | tr '\n' ' ')
    printf '%s\n' "$purged" | grep -qx '/' && pass "purge covers /" || fail "purge list does not contain /"
    n=$(printf '%s\n' "$purged" | grep -c '^/cleveland'); [ "$n" -ge 9 ] && pass "purge covers $n /cleveland/* pages" || fail "purge covers only $n /cleveland/* pages"
  else
    fail "purge response carries no revalidated list — checking the built-in hub list instead"
  fi
fi

# ---- 3. verify every page ---------------------------------------------------
check_page() {
  local p="$1" deadline=$(( $(date +%s) + PAGE_WAIT_SECS )) repurged=0 seen=""
  while :; do
    seen=$(page_sha "$BASE$p")
    if [ "$seen" = "$target" ]; then echo "checked $p → footer @$seen = $target"; echo "- ✅ checked $p → footer @$seen" >> "$SUMMARY"; CHECKED="$CHECKED $p"; return 0; fi
    if [ "$(date +%s)" -ge "$deadline" ]; then fail "footer sha on $p is @${seen:-missing}, expected @$target (after ${PAGE_WAIT_SECS}s)"; return 1; fi
    if [ "$repurged" = 0 ] && [ "$DRY_RUN" != "1" ] && [ "$(date +%s)" -ge $(( deadline - PAGE_WAIT_SECS / 2 )) ]; then
      echo "$p still @${seen:-missing}; re-purging once"; purge; repurged=1
    fi
    echo "$(date -u +%H:%M:%S) $p footer @${seen:-missing}, waiting for @$target"
    sleep "$POLL_SECS"
  done
}
CHECKED=""
for p in $PAGES; do check_page "$p"; done
# One annotation for the whole list (GitHub keeps only 10 per step).
note "verified @$target:$CHECKED"

html=$(curl -s -m 40 -A "$UA" -H 'Cache-Control: no-cache' "$BASE/cleveland/assisted-living")
cards=$(printf '%s' "$html" | grep -o 'data-testid="listing-card"' | wc -l | tr -d ' ')
waiver=$(printf '%s' "$html" | grep -o 'data-testid="listing-waiver-line"' | wc -l | tr -d ' ')
if [ "$cards" -gt 0 ] && [ "$waiver" -gt 0 ]; then pass "waiver lines render ($waiver of $cards cards)"; else fail "no Medicaid-waiver line on /cleveland/assisted-living ($cards cards, $waiver waiver lines)"; fi
echo "cache headers on /cleveland/assisted-living:"; curl -s -m 30 -D - -o /dev/null -A "$UA" "$BASE/cleveland/assisted-living" | grep -iE '^(cf-cache-status|age|cache-control|x-nextjs-cache|server|x-render):' || true

[ "$FAIL" -ne 0 ] && { echo "::error::Post-deploy revalidate FAILED"; exit 1; }
echo "All post-deploy checks passed ($(printf '%s' "$PAGES" | wc -w | tr -d ' ') pages @ $target)."

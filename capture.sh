#!/usr/bin/env bash
set -euo pipefail
# Capture desktop + mobile screenshots of the exact CAPTURE_URL into CAPTURE_DIR.
# - Opens the exact URL in its own browser, waits for rendered content, saves
#   final-desktop.png (1440x900) and final-mobile.png (390x844), closes browser.
# - Exit 75: temporary navigation/browser infrastructure failures (retryable).
# - Exit 1: script usage or rendering defects.
# - Keeps output outside source (CAPTURE_DIR) and leaves the app running.
cd "$(dirname "$0")"

if [[ -z "${CAPTURE_URL:-}" || -z "${CAPTURE_DIR:-}" ]]; then
  echo "capture.sh: Set CAPTURE_URL and CAPTURE_DIR." >&2
  exit 1
fi
echo "capture: URL=$CAPTURE_URL DIR=$CAPTURE_DIR"

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p bash -c '
url="$CAPTURE_URL"
code=$(curl --silent --show-error --max-time 20 -o /dev/null -w "%{http_code}" "$url" 2>/tmp/capture-curl.err) || curl_rc=$? && curl_rc=${curl_rc:-0}
if [ "${curl_rc:-0}" -ne 0 ]; then
  echo "capture: curl failed rc=$curl_rc (temporary infrastructure)" >&2
  cat /tmp/capture-curl.err >&2 || true
  exit 75
fi
echo "capture: pre-check HTTP $code"
case "$code" in
  200|201|202|203|204|301|302|303|304|307|308) ;;
  408|429|500|502|503|504) echo "capture: transient HTTP $code" >&2; exit 75;;
  *) echo "capture: unexpected HTTP $code (rendering defect)" >&2; exit 1;;
esac
'

cleanup() {
  /usr/bin/time -p playwright-cli close >/dev/null 2>&1 || true
}
trap cleanup EXIT

/usr/bin/time -p playwright-cli close >/dev/null 2>&1 || true
if ! /usr/bin/time -p playwright-cli open "$CAPTURE_URL"; then
  echo "capture: browser open failed (temporary infrastructure)" >&2
  exit 75
fi
if ! /usr/bin/time -p playwright-cli snapshot >/dev/null 2>&1; then
  echo "capture: snapshot failed (temporary infrastructure)" >&2
  exit 75
fi
# Wait for rendered app content (title + h1 + emoji picker). Poll briefly.
/usr/bin/time -p bash -c '
for i in $(seq 1 15); do
  if playwright-cli eval "() => document.title + \"|\" + (document.querySelector(\"h1\")?.textContent||\"\") + \"|\" + document.querySelectorAll(\".emoji-btn\").length" 2>/dev/null | grep -q "Mood Tracker"; then
    echo "capture: content ready (attempt $i)"
    exit 0
  fi
  sleep 1
done
echo "capture: rendered content not found (rendering defect)" >&2
playwright-cli snapshot >&2 || true
exit 1
'
# Verify exact content once more; fail closed as rendering defect (exit 1).
/usr/bin/time -p playwright-cli eval "async () => { const t = document.title; const h1 = document.querySelector('h1')?.textContent || ''; const n = document.querySelectorAll('.emoji-btn').length; if (!/Mood Tracker/.test(t+h1) || n < 5) throw new Error('missing app content: title='+t+' h1='+h1+' emojis='+n); return {title:t,h1,emojis:n}; }"

# Desktop 1440x900
/usr/bin/time -p playwright-cli resize 1440 900
if ! /usr/bin/time -p playwright-cli screenshot --filename="$CAPTURE_DIR/final-desktop.png"; then
  echo "capture: desktop screenshot failed" >&2
  if ! playwright-cli snapshot >/dev/null 2>&1; then exit 75; else exit 1; fi
fi
# Mobile 390x844
/usr/bin/time -p playwright-cli resize 390 844
if ! /usr/bin/time -p playwright-cli screenshot --filename="$CAPTURE_DIR/final-mobile.png"; then
  echo "capture: mobile screenshot failed" >&2
  if ! playwright-cli snapshot >/dev/null 2>&1; then exit 75; else exit 1; fi
fi
# Validate PNGs (magic + size) as rendering defects (exit 1).
/usr/bin/time -p bash -c '
for n in final-desktop.png final-mobile.png; do
  p="$CAPTURE_DIR/$n"
  [ -f "$p" ] || { echo "capture: missing $n" >&2; exit 1; }
  sz=$(wc -c < "$p" | tr -d " ")
  [ "$sz" -ge 24 ] || { echo "capture: too small $n ($sz bytes)" >&2; exit 1; }
  magic=$(head -c 8 "$p" | od -An -tx1 | tr -d " \n")
  [ "$magic" = "89504e470d0a1a0a" ] || { echo "capture: not a PNG: $n ($magic)" >&2; exit 1; }
  echo "capture: ok $n ($sz bytes)"
done
'

/usr/bin/time -p playwright-cli close
trap - EXIT
echo "capture: done $CAPTURE_DIR/final-desktop.png $CAPTURE_DIR/final-mobile.png"

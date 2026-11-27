#!/bin/sh
# Serves nginx.conf from a throwaway container and checks its redirects by
# requesting them, not by reading the file. Needs docker and curl.
#
#   sh scripts/check-nginx.sh [path/to/nginx.conf]
#
# Exits 0 when every check passes, 1 when any fails.
set -eu

CONF=${1:-nginx.conf}
CONF_ABS="$(cd "$(dirname "$CONF")" && pwd)/$(basename "$CONF")"
NAME="blog-nginx-check-$$"
PORT=${NGINX_CHECK_PORT:-18643}
URL="http://127.0.0.1:$PORT"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" -p "127.0.0.1:$PORT:80" \
  -v "$CONF_ABS:/etc/nginx/conf.d/default.conf:ro" nginx:alpine >/dev/null
# Wait until nginx answers. --retry-all-errors matters: the port can accept a
# connection and return nothing before nginx is up.
curl -sS -o /dev/null --retry 20 --retry-all-errors --retry-delay 1 "$URL/"

fail=0

# check <path> <expected status> <expected Location header, or - for none>
check() {
  headers=$(curl -sS -o /dev/null -D - --path-as-is "$URL$1" | tr -d '\r')
  status=$(printf '%s\n' "$headers" | sed -n '1s/^HTTP[^ ]* \([0-9][0-9]*\).*/\1/p')
  location=$(printf '%s\n' "$headers" | sed -n 's/^[Ll]ocation: //p')
  [ -n "$location" ] || location=-
  if [ "$status" = "$2" ] && [ "$location" = "$3" ]; then
    echo "ok    $1 -> $status $location"
  else
    echo "FAIL  $1 -> $status $location (expected $2 $3)"
    fail=1
  fi
  # No request may add a header line of its own to the response.
  if printf '%s\n' "$headers" | grep -qi '^x-injected'; then
    echo "FAIL  $1 added a response header: $(printf '%s\n' "$headers" | grep -i '^x-injected')"
    fail=1
  fi
}

check /blog/hello                           301 /writing/hello/
check /blog/url-shortener-phase-2-redis/    301 /writing/url-shortener-phase-2-redis/
check /blog/under_score-and-dash            301 /writing/under_score-and-dash/
check '/blog/abc%0d%0aX-Injected:%20yes/'   404 -
check '/blog/abc%0aX-Injected:%20yes'       404 -
check '/blog/abc%20def'                     404 -
check /blog/a.b                             404 -
check /services                             301 /work/
check /projects/                            301 /work/
check /work/cdk-global                      301 /work/salty/
check /work/embedded-insurance/             301 /work/salty-ai/
check /ai-cohort-1                          301 '/ai-training/#everyday'
check /ai-cohort-2/                         301 '/ai-training/#connect'

if [ "$fail" -ne 0 ]; then
  echo "nginx checks FAILED"
  exit 1
fi
echo "nginx checks passed"

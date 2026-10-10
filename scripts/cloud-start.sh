#!/usr/bin/env bash
set -euo pipefail

cd /workspace/tulelo
mkdir -p /workspace/.cache
readiness_url='http://127.0.0.1:5173'
if curl --fail --silent "$readiness_url" | rg -q '<title>Túlélő'; then
  echo 'The existing Túlélő development server is ready on port 5173.'
  exit 0
fi
if curl --fail --silent "$readiness_url" >/dev/null; then
  echo 'Port 5173 already serves another application; inspect it before starting Túlélő.' >&2
  exit 1
fi

nohup npm run dev -- --port 5173 > /workspace/.cache/tulelo-vite.log 2>&1 < /dev/null &
echo "$!" > /workspace/.cache/tulelo-vite.pid
for attempt in $(seq 1 30); do
  if curl --fail --silent "$readiness_url" | rg -q '<title>Túlélő'; then
    echo 'Túlélő development server is ready on port 5173.'
    exit 0
  fi
  sleep 1
done
echo 'Túlélő did not start; inspect /workspace/.cache/tulelo-vite.log.' >&2
exit 1

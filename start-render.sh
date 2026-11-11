#!/bin/sh
set -e

AI_READY=0

# Start the Python AI service on a fixed loopback port. Render's PORT
# belongs to the Node web server, so override it for this process.
if command -v python3 >/dev/null 2>&1; then
  PORT=5055 python3 /app/ai_service/server.py &
  AI_PID=$!

  # Wait for the AI health endpoint before starting the Node server.
  i=0
  while [ "$i" -lt 40 ]; do
    if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5055/health', timeout=1)" 2>/dev/null; then
      AI_READY=1
      break
    fi
    i=$((i + 1))
    sleep 0.5
  done

  if [ "$AI_READY" -ne 1 ] || ! kill -0 "$AI_PID" 2>/dev/null; then
    echo "WARNING: AI service did not start; continuing without it" >&2
    kill "$AI_PID" 2>/dev/null || true
  fi
else
  echo "WARNING: python3 not found; continuing without the AI service" >&2
fi

echo "Starting Node server (AI ready: $AI_READY)"
exec node /app/backend/server.js

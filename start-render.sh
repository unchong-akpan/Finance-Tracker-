#!/bin/sh
set -e

# Start the Python AI service on a fixed loopback port. Render's PORT
# belongs to the Node web server, so override it for this process.
PORT=5055 python3 /app/ai_service/server.py &
AI_PID=$!

# Wait for the AI health endpoint before starting the Node server.
i=0
while [ "$i" -lt 40 ]; do
  if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5055/health', timeout=1)" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 0.5
done

if ! kill -0 "$AI_PID" 2>/dev/null; then
  echo "AI service failed to start" >&2
  exit 1
fi

exec node /app/backend/server.js

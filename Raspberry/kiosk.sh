#!/bin/sh
# Opens the dashboard full screen (installed as /usr/local/bin/watermonitor-kiosk, run at desktop login)
URL="${1:-http://localhost/}"
until curl -sf -o /dev/null "$URL"; do sleep 2; done  # the web service may start after the desktop
BROWSER=$(command -v chromium-browser || command -v chromium)
exec "$BROWSER" --kiosk --incognito --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
    --check-for-update-interval=31536000 --password-store=basic "$URL"

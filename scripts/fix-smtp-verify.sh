#!/bin/bash

echo "=== 1. Auto-verify all unverified users ==="
# Login as owner
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

# Find pelikanbot1337
FIND=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[email][equals]=lubo-random@web.de&limit=1')
VID=$(echo $FIND | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "  pelikanbot1337 ID: $VID"

if [ -n "$VID" ]; then
  # Update _verified to true
  PATCH=$(curl -s -X PATCH "http://localhost:3001/api/users/$VID" \
    -H 'Content-Type: application/json' \
    -H "Authorization: JWT $TOKEN" \
    -d '{"_verified":true}')
  echo "  Verified: $(echo $PATCH | grep -o '"_verified":[^,]*')"
fi

echo ""
echo "=== 2. Test SMTP connection ==="
# Test if port 587 is open on localhost (Mailcow postfix)
timeout 3 bash -c 'echo QUIT | nc -w3 127.0.0.1 587' 2>/dev/null
if [ $? -eq 0 ]; then
  echo "  Port 587: OPEN"
else
  echo "  Port 587: CLOSED or not responding"
fi

# Check if postfix is running in Mailcow
cd /opt/mailcow-dockerized
sudo docker compose ps postfix-mailcow 2>/dev/null | tail -2

echo ""
echo "=== 3. Test SMTP auth with noreply@dmokb.info ==="
# Try SMTP auth
python3 -c "
import smtplib
try:
    s = smtplib.SMTP('127.0.0.1', 587, timeout=5)
    s.ehlo()
    s.starttls()
    s.login('noreply@dmokb.info', '${NOREPLY_PASSWORD}')
    print('  SMTP auth: SUCCESS')
    s.quit()
except Exception as e:
    print(f'  SMTP auth: FAILED - {e}')
" 2>&1

echo ""
echo "=== 4. Send test email ==="
python3 -c "
import smtplib
from email.mime.text import MIMEText
try:
    msg = MIMEText('This is a test email from DMO KB CMS.')
    msg['Subject'] = 'DMO KB - SMTP Test'
    msg['From'] = 'noreply@dmokb.info'
    msg['To'] = 'eski@dmokb.info'
    s = smtplib.SMTP('127.0.0.1', 587, timeout=5)
    s.ehlo()
    s.starttls()
    s.login('noreply@dmokb.info', '${NOREPLY_PASSWORD}')
    s.send_message(msg)
    print('  Test email sent to eski@dmokb.info!')
    s.quit()
except Exception as e:
    print(f'  Send failed: {e}')
" 2>&1

echo ""
echo "=== 5. Verify pelikanbot1337 can now login ==="
LOGIN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"lubo-random@web.de","password":"TestPass123!"}')
echo "  Login status: $(echo $LOGIN | grep -o '"token":"' | head -1 && echo 'SUCCESS' || echo 'FAILED')"
echo "  Response: $(echo $LOGIN | head -c 150)"

#!/bin/bash
echo "=========================================="
echo "  FULL SYSTEM VERIFICATION"
echo "=========================================="

echo ""
echo "=== 1. Website loads ==="
STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://dmokb.info)
echo "  dmokb.info: $STATUS"

echo ""
echo "=== 2. Icons (no 503s) ==="
echo -n "  Rank (SSS): "; curl -s -o /dev/null -w '%{http_code}\n' https://dmokb.info/icons/Ranks/SSS.png
echo -n "  Element (Fire): "; curl -s -o /dev/null -w '%{http_code}\n' https://dmokb.info/icons/Elements/Fire.png
echo -n "  Attribute (Vaccine): "; curl -s -o /dev/null -w '%{http_code}\n' https://dmokb.info/icons/Attributes/Vaccine.png
echo -n "  Attribute (None): "; curl -s -o /dev/null -w '%{http_code}\n' https://dmokb.info/icons/Attributes/None.png
echo -n "  Family (NatureSpirits): "; curl -s -o /dev/null -w '%{http_code}\n' https://dmokb.info/icons/Families/NatureSpirits.png

echo ""
echo "=== 3. Digimon page ==="
echo -n "  /digimon: "; curl -s -o /dev/null -w '%{http_code}\n' https://dmokb.info/digimon

echo ""
echo "=== 4. Auth providers ==="
PROVIDERS=$(curl -s https://dmokb.info/api/auth/providers)
echo "$PROVIDERS" | grep -o '"id":"[^"]*"'

echo ""
echo "=== 5. CMS login (eski@dmokb.info) ==="
LOGIN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}')
echo "  Token: $(echo $LOGIN | grep -o '"token":"[^"]*"' | head -c 30)..."
echo "  Role: $(echo $LOGIN | grep -o '"role":"[^"]*"')"

echo ""
echo "=== 6. Registration test ==="
REG=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"verifytest99","email":"verify99@test.com","password":"TestPass123!","confirmPassword":"TestPass123!","name":"Verify Test"}')
echo "  Result: $REG"

echo ""
echo "=== 7. Mailcow UI ==="
echo -n "  mail.dmokb.info: "; curl -s -o /dev/null -w '%{http_code}\n' https://mail.dmokb.info

echo ""
echo "=== 8. SOGo Webmail ==="
curl -sk -c /tmp/mc-verify -b /tmp/mc-verify 'https://mail.dmokb.info/' -o /dev/null
curl -sk -c /tmp/mc-verify -b /tmp/mc-verify -X POST 'https://mail.dmokb.info/' \
  -d 'login_user=eski%40dmokb.info&pass=EskiDMOKB2026%21' -o /dev/null
SOGO=$(curl -sk -c /tmp/mc-verify -b /tmp/mc-verify 'https://mail.dmokb.info/SOGo/so/' -o /dev/null -w '%{http_code}')
echo "  SOGo after login: $SOGO"
rm -f /tmp/mc-verify

echo ""
echo "=== 9. DNS Records ==="
echo -n "  MX: "; dig MX dmokb.info +short
echo -n "  A (mail): "; dig A mail.dmokb.info +short
echo -n "  TXT: "; dig TXT dmokb.info +short
echo -n "  DMARC: "; dig TXT _dmarc.dmokb.info +short

echo ""
echo "=== 10. PM2 Status ==="
pm2 status

echo ""
echo "=== 11. Cleanup verify test user ==="
TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
FIND=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[email][equals]=verify99@test.com&limit=1')
VID=$(echo $FIND | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
if [ -n "$VID" ]; then
  curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null -w 'Deleted test user: %{http_code}\n'
fi

echo ""
echo "=========================================="
echo "  VERIFICATION COMPLETE"
echo "=========================================="

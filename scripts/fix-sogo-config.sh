#!/bin/bash
set -e

cd /opt/mailcow-dockerized

# Get DB credentials
DBPASS=$(sudo grep '^DBPASS=' mailcow.conf | cut -d= -f2)
DBUSER=$(sudo grep '^DBUSER=' mailcow.conf | cut -d= -f2)
DBNAME=$(sudo grep '^DBNAME=' mailcow.conf | cut -d= -f2)
HOSTNAME=$(sudo grep '^MAILCOW_HOSTNAME=' mailcow.conf | cut -d= -f2)

echo "DB: $DBUSER@$DBNAME, Host: $HOSTNAME"

# The SOGo config is missing SOGoUserSources. We need to add it before the closing }
# First, back up the current config
sudo docker compose exec -T sogo-mailcow cp /etc/sogo/sogo.conf /etc/sogo/sogo.conf.broken

# Create the fixed config with SOGoUserSources
sudo docker compose exec -T sogo-mailcow bash -c "cat > /tmp/sogo-patch.conf << 'SOGOEOF'

    SOGoProfileURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_user_profile\";
    OCSFolderInfoURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_folder_info\";
    OCSSessionsFolderURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_sessions_folder\";
    OCSEMailAlarmsFolderURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_alarms_folder\";
    OCSStoreURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_store\";
    OCSAclURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_acl\";
    OCSCacheFolderURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_cache_folder\";

    SOGoIMAPServer = \"imap://dovecot:143/?tls=YES&tlsVerifyMode=none\";
    SOGoSMTPServer = \"smtp://postfix:588/?tls=YES&tlsVerifyMode=none\";
    SOGoMailDomain = \"${HOSTNAME}\";

    SOGoUserSources = (
        {
            type = sql;
            id = directory;
            viewURL = \"mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_view\";
            canAuthenticate = YES;
            isAddressBook = YES;
            userPasswordAlgorithm = blf-crypt;
            prependPasswordScheme = YES;
        }
    );
SOGOEOF
"

# Now inject the patch into sogo.conf (before the last closing brace)
sudo docker compose exec -T sogo-mailcow bash -c "
  # Remove the last closing brace
  sed -i '$ d' /etc/sogo/sogo.conf
  # Append the user sources config
  cat /tmp/sogo-patch.conf >> /etc/sogo/sogo.conf
  # Add back the closing brace
  echo '}' >> /etc/sogo/sogo.conf
  rm /tmp/sogo-patch.conf
"

echo ""
echo "=== Verifying SOGo config has UserSources ==="
sudo docker compose exec -T sogo-mailcow grep -c 'SOGoUserSources' /etc/sogo/sogo.conf

# Create the sogo_view in MySQL (required for SOGo to look up users)
echo ""
echo "=== Creating sogo_view in MySQL ==="
sudo docker compose exec -T mysql-mailcow mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "
CREATE OR REPLACE VIEW sogo_view AS
  SELECT c_uid, domain, c_name, c_password, c_cn, mail, aliases, ad, c_uid AS c_email
  FROM (
    SELECT
      username AS c_uid,
      domain,
      username AS c_name,
      password AS c_password,
      name AS c_cn,
      username AS mail,
      '' AS aliases,
      0 AS ad
    FROM mailbox
    WHERE active = 1
  ) sub;
" 2>/dev/null && echo "sogo_view created!" || echo "sogo_view creation failed"

# Verify view
echo ""
echo "=== Verifying sogo_view ==="
sudo docker compose exec -T mysql-mailcow mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "SELECT c_uid, c_cn FROM sogo_view;" 2>/dev/null

# Restart SOGo
echo ""
echo "=== Restarting SOGo ==="
sudo docker compose restart sogo-mailcow 2>/dev/null
sleep 10

# Test SOGo auth
echo ""
echo "=== Testing SOGo login ==="
sudo docker compose exec -T sogo-mailcow curl -s -o /dev/null -w '%{http_code}' -X POST 'http://127.0.0.1:20000/SOGo/connect' -d 'userName=eski@dmokb.info&password=EskiDMOKB2026!' 2>&1
echo " SOGo login status"

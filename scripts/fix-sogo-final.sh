#!/bin/bash
set -e
cd /opt/mailcow-dockerized

DBPASS=$(sudo grep '^DBPASS=' mailcow.conf | cut -d= -f2)
DBUSER=$(sudo grep '^DBUSER=' mailcow.conf | cut -d= -f2)
DBNAME=$(sudo grep '^DBNAME=' mailcow.conf | cut -d= -f2)

echo "Writing complete sogo.conf..."

sudo docker compose exec -T sogo-mailcow tee /etc/sogo/sogo.conf > /dev/null << SOGOEOF
{
  WOWorkersCount = 10;
  SOGoACLsSendEMailNotifications = YES;
  SOGoAppointmentSendEMailNotifications = YES;
  SOGoDraftsFolderName = "Drafts";
  SOGoJunkFolderName = "Junk";
  SOGoSentFolderName = "Sent";
  SOGoTrashFolderName = "Trash";
  SOGoEnableEMailAlarms = YES;
  SOGoMailHideInlineAttachments = YES;
  SOGoFoldersSendEMailNotifications = YES;
  SOGoForwardEnabled = YES;
  SOGoEnableMailCleaning = YES;
  SOGoDisableOrganizerEventCheck = YES;
  SOGoEnablePublicAccess = YES;
  SOGoPasswordChangeEnabled = NO;
  SOGoMailShowSubscribedFoldersOnly = NO;
  SOGoSieveScriptsEnabled = YES;
  SOGoVacationEnabled = YES;
  SOGoMailAuxiliaryUserAccountsEnabled = YES;
  SOGoMailCustomFromEnabled = YES;
  SOGoEASSearchInBody = YES;

  WOPort = "0.0.0.0:20000";
  SOGoMemcachedHost = "memcached";
  SOGoLanguage = English;
  SOGoPageTitle = "SOGo - DMO KB Mail";
  SOGoFirstDayOfWeek = 1;
  SOGoSieveFolderEncoding = "UTF-8";
  NGImap4ConnectionStringSeparator = "/";
  SOGoIMAPAclConformsToIMAPExt = YES;
  SxVMemLimit = 384;
  SOGoMaximumPingInterval = 3540;
  SOGoInternalSyncInterval = 45;
  SOGoMaximumSyncInterval = 3540;
  SOGoMaximumSyncResponseSize = 512;
  WOWatchDogRequestTimeout = 30;
  WOListenQueueSize = 16;
  WONoDetach = YES;
  SOGoCacheCleanupInterval = 900;
  SOGoMaximumFailedLoginCount = 10;
  SOGoMaximumFailedLoginInterval = 900;
  SOGoFailedLoginBlockInterval = 900;
  MySQL4Encoding = "utf8mb4";
  GCSChannelCollectionTimer = 60;
  GCSChannelExpireAge = 60;
  WOLogFile = "/dev/sogo_log";

  SOGoMailingMechanism = smtp;
  SOGoSMTPServer = "smtp://postfix:588/?tls=YES&tlsVerifyMode=none";
  SOGoSMTPAuthenticationType = plain;
  SOGoIMAPServer = "imap://dovecot:143/?tls=YES&tlsVerifyMode=none";
  SOGoMailDomain = "dmokb.info";

  SOGoProfileURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_user_profile";
  OCSFolderInfoURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_folder_info";
  OCSSessionsFolderURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_sessions_folder";
  OCSEMailAlarmsFolderURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_alarms_folder";
  OCSStoreURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_store";
  OCSAclURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_acl";
  OCSCacheFolderURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_cache_folder";

  SOGoUserSources = (
    {
      type = sql;
      id = directory;
      displayName = "Global Address Book";
      viewURL = "mysql://${DBUSER}:${DBPASS}@mysql:3306/${DBNAME}/sogo_view";
      canAuthenticate = YES;
      isAddressBook = YES;
      userPasswordAlgorithm = "blf-crypt";
      prependPasswordScheme = YES;
    }
  );
}
SOGOEOF

echo "Config written. Verifying..."
sudo docker compose exec -T sogo-mailcow head -5 /etc/sogo/sogo.conf
sudo docker compose exec -T sogo-mailcow grep -c 'SOGoUserSources' /etc/sogo/sogo.conf
echo "UserSources found"

echo ""
echo "Restarting SOGo..."
sudo docker compose restart sogo-mailcow 2>/dev/null
sleep 15

echo ""
echo "=== SOGo logs ==="
sudo docker compose logs sogo-mailcow --tail 5 2>/dev/null

echo ""
echo "=== Testing webmail ==="
curl -sk -c /tmp/sogo-test -b /tmp/sogo-test 'https://mail.dmokb.info/' -o /dev/null
curl -sk -c /tmp/sogo-test -b /tmp/sogo-test -X POST 'https://mail.dmokb.info/' -d "login_user=eski%40dmokb.info&pass=${CMS_ADMIN_PASSWORD}" -o /dev/null
curl -sk -c /tmp/sogo-test -b /tmp/sogo-test 'https://mail.dmokb.info/SOGo/so/' -o /dev/null -w '%{http_code}'
echo " webmail-status"
rm -f /tmp/sogo-test

#!/bin/bash
set -e
cd /opt/mailcow-dockerized

# Create all directory mounts
for d in \
  data/conf/mysql \
  data/conf/clamav \
  data/conf/rspamd/custom \
  data/conf/rspamd/override.d \
  data/conf/rspamd/local.d \
  data/conf/rspamd/plugins.d \
  data/conf/rspamd/lua \
  data/conf/rspamd/dynmaps \
  data/conf/dovecot/auth \
  data/conf/dovecot/global_sieve_before \
  data/conf/dovecot/global_sieve_after \
  data/conf/sogo \
  data/conf/phpfpm/crons \
  data/conf/phpfpm/sogo-sso \
  data/conf/phpfpm/php-fpm.d \
  data/conf/phpfpm/php-conf.d \
  data/conf/nginx \
  data/conf/postfix \
  data/conf/unbound \
  data/assets/ssl \
  data/web \
  data/db/mysql \
  data/db/redis
do
  mkdir -p "$d"
done

# Create all FILE mounts (these must be files, not directories)
for f in \
  data/conf/unbound/unbound.conf \
  data/conf/redis/redis-conf.sh \
  data/conf/rspamd/rspamd.conf.local \
  data/conf/rspamd/rspamd.conf.override \
  data/conf/rspamd/meta_exporter \
  data/conf/dovecot/auth/mailcowauth.php \
  data/conf/phpfpm/php-fpm.d/pools.conf \
  data/conf/phpfpm/php-conf.d/opcache-recommended.ini \
  data/conf/phpfpm/php-conf.d/upload.ini \
  data/conf/phpfpm/php-conf.d/other.ini \
  data/conf/sogo/custom-favicon.ico \
  data/conf/sogo/custom-shortlogo.svg \
  data/conf/sogo/custom-fulllogo.svg \
  data/conf/sogo/custom-fulllogo.png \
  data/conf/sogo/custom-theme.js
do
  mkdir -p "$(dirname "$f")"
  [ -f "$f" ] || touch "$f"
done

# Generate self-signed SSL certs for internal mailcow nginx
if [ ! -f data/assets/ssl/cert.pem ]; then
  openssl req -x509 -newkey rsa:2048 \
    -keyout data/assets/ssl/key.pem \
    -out data/assets/ssl/cert.pem \
    -days 365 -nodes -subj '/CN=mail.dmokb.info' 2>/dev/null
  openssl dhparam -out data/assets/ssl/dhparams.pem 2048 2>/dev/null
fi

echo "All mount points created successfully"
ls -la data/conf/unbound/unbound.conf
ls -la data/conf/sogo/custom-fulllogo.svg

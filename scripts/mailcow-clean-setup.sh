#!/bin/bash
set -e

cd /opt/mailcow-dockerized

# Remove old data completely
sudo rm -rf data/db data/conf data/assets/ssl-example data/web
sudo rm -f mailcow.conf

# Generate config properly using the official script
# Feed answers: hostname, timezone
printf "mail.dmokb.info\nEurope/Berlin\n" | sudo bash generate_config.sh 2>&1 || true

# Now patch the generated config for our needs
sudo sed -i 's/^HTTP_PORT=.*/HTTP_PORT=8080/' mailcow.conf
sudo sed -i 's/^HTTPS_PORT=.*/HTTPS_PORT=8443/' mailcow.conf  
sudo sed -i 's/^HTTP_BIND=.*/HTTP_BIND=127.0.0.1/' mailcow.conf
sudo sed -i 's/^HTTPS_BIND=.*/HTTPS_BIND=127.0.0.1/' mailcow.conf
sudo sed -i 's/^SKIP_LETS_ENCRYPT=.*/SKIP_LETS_ENCRYPT=y/' mailcow.conf
sudo sed -i 's/^SKIP_CLAMD=.*/SKIP_CLAMD=y/' mailcow.conf

# Ensure SKIP_SOLR is set
grep -q '^SKIP_SOLR=' mailcow.conf && sudo sed -i 's/^SKIP_SOLR=.*/SKIP_SOLR=y/' mailcow.conf || echo 'SKIP_SOLR=y' | sudo tee -a mailcow.conf

# Ensure SSL certs exist for internal nginx
sudo mkdir -p data/assets/ssl
if [ ! -f data/assets/ssl/cert.pem ]; then
    sudo openssl req -x509 -newkey rsa:2048 \
        -keyout data/assets/ssl/key.pem \
        -out data/assets/ssl/cert.pem \
        -days 365 -nodes -subj '/CN=mail.dmokb.info' 2>/dev/null
    sudo openssl dhparam -out data/assets/ssl/dhparams.pem 2048 2>/dev/null
fi

echo ""
echo "=== Config Summary ==="
grep -E '^(MAILCOW_HOSTNAME|HTTP_PORT|HTTPS_PORT|HTTP_BIND|HTTPS_BIND|SKIP_LETS|SKIP_CLAMD|SKIP_SOLR|DBNAME|DBUSER)=' mailcow.conf
echo ""

# Pull and start
echo "Pulling containers..."
sudo docker compose pull 2>&1 | tail -3
echo "Starting containers..."
sudo docker compose up -d 2>&1 | grep -v 'variable is not set' | tail -10

echo ""
echo "=== Mailcow Setup Complete ==="
echo "Waiting for initialization..."

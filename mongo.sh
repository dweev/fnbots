#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_info() { echo -e "${BLUE}$1${NC}"; }
print_step() { echo -e "${BLUE}$1${NC}"; }

print_step "Memperbaiki masalah MongoDB..."

print_info "Membersihkan environment variable..."
sudo systemctl unset-environment MONGODB_CONFIG_OVERRIDE_NOFORK
sudo systemctl daemon-reload

print_info "Memperbaiki service file..."
sudo cp /usr/lib/systemd/system/mongod.service /usr/lib/systemd/system/mongod.service.backup
sudo sed -i '/Environment="MONGODB_CONFIG_OVERRIDE_NOFORK=1"/d' /usr/lib/systemd/system/mongod.service

print_info "Membersihkan environment files..."
sudo sed -i '/MONGODB_CONFIG_OVERRIDE_NOFORK/d' /etc/environment
sudo rm -f /etc/default/mongod
sudo systemctl daemon-reload

print_info "Membuat konfigurasi MongoDB..."
sudo tee /etc/mongod.conf > /dev/null << 'EOF'
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
net:
  port: 27017
  bindIp: 127.0.0.1
processManagement:
  fork: false
  timeZoneInfo: /usr/share/zoneinfo
EOF

print_info "Menghentikan process MongoDB..."
sudo pkill -f mongod
sudo systemctl stop mongod
sleep 3

print_info "Membersihkan data dan lock files..."
sudo rm -rf /var/lib/mongodb/*
sudo rm -rf /var/log/mongodb/*
sudo rm -f /tmp/mongodb-*.sock
sudo rm -f /var/lib/mongodb/mongod.lock

print_info "Membuat ulang directories..."
sudo mkdir -p /var/lib/mongodb
sudo mkdir -p /var/log/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
sudo chmod 755 /var/lib/mongodb
sudo chmod 755 /var/log/mongodb

print_info "Starting MongoDB via systemd..."
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod --no-pager

print_info "Testing koneksi..."
sleep 5
mongosh --eval "db.adminCommand('ping')"

print_success "Perbaikan MongoDB selesai ✅"

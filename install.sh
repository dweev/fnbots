#!/usr/bin/env bash

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

setup_privileges() {
    if [ "$EUID" -eq 0 ]; then
        print_success "Menjalankan script sebagai root"
        SUDO_CMD=""
        ORIGINAL_USER="${SUDO_USER:-root}"
    elif command -v sudo >/dev/null 2>&1; then
        if sudo -n true 2>/dev/null; then
            print_success "Menjalankan script dengan sudo passwordless"
            SUDO_CMD="sudo"
            ORIGINAL_USER="$USER"
        else
            print_info "Memerlukan password sudo untuk melanjutkan..."
            if sudo -v; then
                print_success "Akses sudo berhasil diverifikasi"
                SUDO_CMD="sudo"
                ORIGINAL_USER="$USER"
            else
                print_error "Gagal mendapatkan akses sudo"
                exit 1
            fi
        fi
    else
        print_error "Script harus dijalankan sebagai root atau user dengan sudo"
        exit 1
    fi
}

detect_os() {
    if [ ! -f /etc/os-release ]; then
        print_error "File /etc/os-release tidak ditemukan. Sistem tidak didukung."
        exit 1
    fi

    . /etc/os-release
    
    OS_NAME="$NAME"
    OS_VERSION="$VERSION_ID"
    OS_CODENAME="$VERSION_CODENAME"
    
    print_info "Sistem Operasi: $OS_NAME $OS_VERSION ($OS_CODENAME)"
    
    if [[ ! "$OS_NAME" =~ "Ubuntu" ]]; then
        print_error "Script ini hanya mendukung Ubuntu. Sistem terdeteksi: $OS_NAME"
        exit 1
    fi
    
    case "$OS_VERSION" in
        20.04|22.04|24.04)
            print_success "Versi Ubuntu didukung: $OS_VERSION"
            ;;
        *)
            print_warning "Versi Ubuntu $OS_VERSION mungkin tidak sepenuhnya didukung"
            print_warning "Script dirancang untuk Ubuntu 20.04, 22.04, dan 24.04"
            read -p "Lanjutkan? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
            ;;
    esac
}

check_cpu_capabilities() {
    print_step "Memeriksa CPU capabilities..."
    CPU_HAS_AVX=false
    if grep -q avx /proc/cpuinfo; then
        CPU_HAS_AVX=true
        print_success "CPU mendukung AVX"
    else
        print_warning "CPU TIDAK mendukung AVX"
    fi
}

update_system() {
    print_step "Mengupdate daftar paket..."
    $SUDO_CMD apt-get update -y
    
    print_step "Memeriksa broken packages..."
    if ! $SUDO_CMD apt-get check 2>/dev/null; then
        print_warning "Mendeteksi broken packages!"
        print_info "Mencoba memperbaiki broken packages..."
        $SUDO_CMD dpkg --configure -a 2>/dev/null || true
        $SUDO_CMD apt-get install -f -y 2>/dev/null || true
    fi
    
    print_step "Mengupgrade sistem..."
    if $SUDO_CMD env DEBIAN_FRONTEND=noninteractive apt-get upgrade -y; then
        print_success "Sistem berhasil diupgrade"
    else
        print_warning "Upgrade mengalami masalah, akan dilanjutkan setelah cleanup"
    fi
    
    $SUDO_CMD apt-get autoremove -y 2>/dev/null || true
    
    print_success "Update sistem selesai"
}

install_base_dependencies() {
    print_step "Menginstall dependencies dasar..."
    
    $SUDO_CMD apt-get install -y \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        curl \
        wget \
        git \
        build-essential \
        pkg-config \
        cmake \
        gcc \
        g++ \
        make \
        mc \
        zip \
        unzip \
        tree \
        neofetch \
        zlib1g-dev \
        libcurl4-openssl-dev \
        libnghttp2-dev \
        libssl-dev
    
    print_success "Dependencies dasar berhasil diinstall"
}

fix_mongodb_environment() {
    print_step "Memperbaiki environment variable MongoDB..."
    
    $SUDO_CMD systemctl unset-environment MONGODB_CONFIG_OVERRIDE_NOFORK 2>/dev/null || true
    
    if [ -f "/usr/lib/systemd/system/mongod.service" ]; then
        print_info "Memperbaiki service file MongoDB..."
        $SUDO_CMD cp /usr/lib/systemd/system/mongod.service /usr/lib/systemd/system/mongod.service.backup 2>/dev/null || true
        $SUDO_CMD sed -i '/Environment="MONGODB_CONFIG_OVERRIDE_NOFORK=1"/d' /usr/lib/systemd/system/mongod.service 2>/dev/null || true
    fi
    
    $SUDO_CMD systemctl daemon-reload
    print_success "Environment variable MongoDB diperbaiki"
}

cleanup_mongodb_sockets() {
    print_step "Membersihkan socket files MongoDB..."
    
    $SUDO_CMD rm -f /tmp/mongodb-*.sock 2>/dev/null || true
    $SUDO_CMD rm -f /var/lib/mongodb/mongod.lock 2>/dev/null || true
    
    print_success "Socket files MongoDB dibersihkan"
}

create_mongodb_config() {
    print_step "Membuat konfigurasi MongoDB..."
    
    $SUDO_CMD tee /etc/mongod.conf > /dev/null << 'EOF'
# mongod.conf

# Where and how to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1
  unixDomainSocket:
    enabled: false

# how the process runs
processManagement:
  fork: false
  timeZoneInfo: /usr/share/zoneinfo

# security:
#   authorization: enabled

# setParameter:
#   enableLocalhostAuthBypass: false
EOF

    print_success "Konfigurasi MongoDB dibuat"
}

setup_mongodb_directories() {
    print_step "Menyiapkan directories MongoDB..."
    
    $SUDO_CMD mkdir -p /var/lib/mongodb
    $SUDO_CMD mkdir -p /var/log/mongodb
    $SUDO_CMD chown -R mongodb:mongodb /var/lib/mongodb
    $SUDO_CMD chown -R mongodb:mongodb /var/log/mongodb
    $SUDO_CMD chmod 755 /var/lib/mongodb
    $SUDO_CMD chmod 755 /var/log/mongodb
    
    print_success "Directories MongoDB disiapkan"
}

install_mongodb() {    
    $SUDO_CMD systemctl stop mongod 2>/dev/null || true
    
    print_step "Menghentikan process MongoDB yang aktif..."
    $SUDO_CMD pkill -f mongod 2>/dev/null || true
    sleep 3
    
    print_step "Menghapus instalasi MongoDB lama..."
    $SUDO_CMD apt remove --purge mongodb-org* -y 2>/dev/null || true
    
    print_step "Membersihkan data lama..."
    $SUDO_CMD rm -rf /var/lib/mongodb
    $SUDO_CMD rm -rf /var/log/mongodb
    
    print_step "Menghapus repository lama..."
    $SUDO_CMD rm -f /etc/apt/sources.list.d/mongodb*.list 2>/dev/null || true
    $SUDO_CMD rm -f /usr/share/keyrings/mongodb*.gpg 2>/dev/null || true
    
    print_step "Menambahkan repository MongoDB..."
    $SUDO_CMD apt-get install -y gnupg curl
    curl -fsSL "https://www.mongodb.org/static/pgp/server-4.4.asc" | \
        $SUDO_CMD gpg --dearmor -o /usr/share/keyrings/mongodb-server-4.4.gpg
    
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-4.4.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | \
        $SUDO_CMD tee /etc/apt/sources.list.d/mongodb-org-4.4.list
    
    print_step "Update package list..."
    $SUDO_CMD apt-get update -y
    
    print_step "Install MongoDB..."
    $SUDO_CMD apt-get install -y mongodb-org

    sleep 2
    
    fix_mongodb_environment
    cleanup_mongodb_sockets
    create_mongodb_config
    setup_mongodb_directories
    
    print_step "Reset data directories..."
    $SUDO_CMD rm -rf /var/lib/mongodb/*
    $SUDO_CMD rm -rf /var/log/mongodb/*
    $SUDO_CMD chown -R mongodb:mongodb /var/lib/mongodb
    $SUDO_CMD chown -R mongodb:mongodb /var/log/mongodb

    print_step "Start MongoDB service..."
    $SUDO_CMD systemctl daemon-reload
    $SUDO_CMD systemctl enable mongod
    $SUDO_CMD systemctl restart mongod
    sleep 5

    if $SUDO_CMD systemctl is-active --quiet mongod; then
        print_success "MongoDB berhasil diinstall dan berjalan via systemd"
    else
        print_error "MongoDB gagal dijalankan otomatis. Cek log dengan:"
        echo "   sudo journalctl -u mongod -xe"
        echo "   atau sudo tail -f /var/log/mongodb/mongod.log"
    fi
}

install_redis() {
    print_step "Menginstall Redis..."
    $SUDO_CMD apt-get install -y redis-server
    
    print_step "Mengkonfigurasi Redis..."
    REDIS_CONF="/etc/redis/redis.conf"
    if [ -f "$REDIS_CONF" ]; then
        $SUDO_CMD cp "$REDIS_CONF" "${REDIS_CONF}.backup"
        
        if grep -q "^appendonly no" "$REDIS_CONF"; then
            $SUDO_CMD sed -i 's/^appendonly no/appendonly yes/' "$REDIS_CONF"
            print_info "AOF persistence diaktifkan"
        fi
        
        $SUDO_CMD sed -i '/^save [0-9]/d' "$REDIS_CONF"
        $SUDO_CMD sed -i '/^# save [0-9]/d' "$REDIS_CONF"
        
        cat << 'EOF' | $SUDO_CMD tee -a "$REDIS_CONF" > /dev/null

# RDB Snapshots Configuration
save 900 1
save 300 10
save 60 10000
EOF
        
        print_info "RDB snapshotting dikonfigurasi"
    fi
    
    $SUDO_CMD systemctl enable redis-server
    $SUDO_CMD systemctl restart redis-server
    
    if $SUDO_CMD systemctl is-active --quiet redis-server; then
        print_success "Redis berhasil diinstall dan berjalan"
    else
        print_warning "Redis terinstall tapi tidak berjalan"
    fi
}

install_python() {
    print_step "Menginstall Python 3.12..."
    
    case "$OS_VERSION" in
        20.04)
            $SUDO_CMD apt-get install -y python3-apt python3-gi
            if [ -f "/usr/lib/python3/dist-packages/apt_pkg.cpython-38-x86_64-linux-gnu.so" ]; then
                $SUDO_CMD ln -sf /usr/lib/python3/dist-packages/apt_pkg.cpython-38-x86_64-linux-gnu.so \
                    /usr/lib/python3/dist-packages/apt_pkg.so
            fi
            
            curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xf23c5a6cf475977595c89f51ba6932366a755776" | \
                $SUDO_CMD gpg --dearmor -o /etc/apt/trusted.gpg.d/deadsnakes.gpg
            echo "deb http://ppa.launchpad.net/deadsnakes/ppa/ubuntu focal main" | \
                $SUDO_CMD tee /etc/apt/sources.list.d/deadsnakes-ppa.list
            ;;
        *)
            $SUDO_CMD apt-get install -y python3-gi
            $SUDO_CMD add-apt-repository -y ppa:deadsnakes/ppa
            ;;
    esac
    
    $SUDO_CMD apt-get update -y
    
    print_step "Menginstall Python development libraries..."
    $SUDO_CMD apt-get install -y \
        python3 \
        python3-dev \
        libglib2.0-dev \
        libharfbuzz-dev \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev \
        libgif-dev \
        libicu-dev \
        libffi-dev \
        libssl-dev \
        libpango1.0-dev \
        libcairo2-dev \
        libfreetype6-dev \
        libopus-dev \
        libvpx-dev
    
    print_step "Menginstall Python 3.12..."
    $SUDO_CMD apt-get install -y \
        python3.12 \
        python3.12-venv \
        python3.12-dev \
        python3-pip
    
    print_success "Python 3.12 berhasil diinstall"
}

install_nodejs() {
    print_step "Menginstall Node.js v20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO_CMD bash -
    $SUDO_CMD apt-get install -y nodejs
    $SUDO_CMD npm install -g npm@latest
    print_success "Node.js $(node -v) dan npm $(npm -v) berhasil diinstall"
}

install_multimedia_tools() {
    print_step "Menginstall multimedia tools..."
    $SUDO_CMD apt-get install -y \
        ffmpeg \
        imagemagick \
        webp \
        libavformat-dev \
        libavcodec-dev \
        libavutil-dev \
        libavfilter-dev \
        libswscale-dev \
        libswresample-dev \
        libwebp-dev
    
    print_success "Multimedia tools berhasil diinstall"
}

install_speedtest() {
    print_step "Menginstall Speedtest CLI..."
    case "$OS_VERSION" in
        24.04)
            curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | $SUDO_CMD bash
            if [ -f /etc/apt/sources.list.d/ookla_speedtest-cli.list ]; then
                $SUDO_CMD sed -i 's/noble/jammy/g' /etc/apt/sources.list.d/ookla_speedtest-cli.list
            fi
            ;;
        *)
            curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | $SUDO_CMD bash
            ;;
    esac
    
    $SUDO_CMD apt-get update -y
    $SUDO_CMD apt-get install -y speedtest
    print_success "Speedtest CLI berhasil diinstall"
}

setup_timezone() {
    print_step "Mengatur timezone ke Asia/Jakarta..."
    $SUDO_CMD ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
    echo "Asia/Jakarta" | $SUDO_CMD tee /etc/timezone
    export TZ=Asia/Jakarta
    print_success "Timezone berhasil diatur ke Asia/Jakarta"
}

setup_venv() {
    print_step "Membuat Python virtual environment..."
    if [ ! -d "venv" ]; then
        python3.12 -m venv venv
        print_success "Virtual environment berhasil dibuat"
    else
        print_warning "Virtual environment sudah ada, melewati pembuatan"
    fi
    
    if [ -f "venv/bin/pip" ]; then
        print_step "Mengupgrade pip, setuptools, dan wheel..."
        venv/bin/pip install --upgrade pip setuptools wheel
        if [ -f "requirements.txt" ]; then
            print_step "Menginstall requirements.txt..."
            venv/bin/pip install -r requirements.txt
        else
            print_step "Menginstall paket Python default..."
            venv/bin/pip install --upgrade \
                yt-dlp \
                google-generativeai \
                python-dotenv \
                ffmpeg-python \
                "g4f[all]" \
                rembg \
                Pillow \
                sticker-convert
            
            print_info "Menginstall yt-dlp dari GitHub..."
            venv/bin/pip install -U "yt-dlp @ git+https://github.com/yt-dlp/yt-dlp.git"
        fi
        
        print_success "Paket Python berhasil diinstall"
    else
        print_error "Virtual environment tidak ditemukan"
    fi
}

install_npm_globals() {
    print_step "Menginstall NPM global packages..."
    $SUDO_CMD npm install -g node-gyp pm2
    print_success "NPM global packages berhasil diinstall"
}

install_project_dependencies() {
    if [ -f "package.json" ]; then
        print_step "Menginstall dependencies dari package.json..."
        npm install
        print_success "Dependencies berhasil diinstall"
    else
        print_warning "package.json tidak ditemukan, melewati npm install"
    fi
}

install_playwright() {
    print_step "Menginstall Playwright..."
    npx playwright install-deps
    npx playwright install
    print_success "Playwright berhasil diinstall"
}

cleanup() {
    print_step "Membersihkan cache dan temporary files..."
    $SUDO_CMD apt-get autoremove -y
    $SUDO_CMD apt-get clean
    print_success "Cleanup selesai"
}

fix_permissions() {
    print_step "Memperbaiki permissions folder..."
    if [ "$ORIGINAL_USER" != "root" ] && [ -n "$ORIGINAL_USER" ]; then
        $SUDO_CMD chown -R "$ORIGINAL_USER:$ORIGINAL_USER" .
        print_success "Permissions berhasil diperbaiki untuk user: $ORIGINAL_USER"
    fi
}

install_mongosh() {
    print_step "Menginstall mongosh..."
    
    $SUDO_CMD apt-get update -y
    $SUDO_CMD apt install mongosh -y
    print_success "mongosh berhasil diinstall"
}

print_summary() {
    echo ""
    echo "==============================================================="
    print_success "INSTALASI SELESAI!"
    echo "==============================================================="
    echo ""
    echo "Status Layanan:"
    echo "   MongoDB Process: $(sudo ps aux | grep mongod | grep -v grep | wc -l) process berjalan"
    echo "   Redis:   $($SUDO_CMD systemctl is-active redis-server 2>/dev/null || echo 'tidak terinstall')"
    echo ""
    echo "Python:"
    echo "   Versi: $(python3.12 --version 2>/dev/null || echo 'tidak terinstall')"
    echo "   Venv:  $([ -d venv ] && echo 'tersedia' || echo 'tidak ada')"
    echo ""
    echo "Node.js:"
    echo "   Node:  $(node -v 2>/dev/null || echo 'tidak terinstall')"
    echo "   NPM:   $(npm -v 2>/dev/null || echo 'tidak terinstall')"
    echo "   PM2:   $(pm2 -v 2>/dev/null || echo 'tidak terinstall')"
    echo ""
    echo "MongoDB:"
    echo "   Versi: $(mongod --version 2>/dev/null | head -1 | awk '{print $3}' || echo 'tidak terinstall')"
    echo "   CPU AVX: $([ "$CPU_HAS_AVX" = true ] && echo 'supported' || echo 'not supported')"
    echo ""
    echo "Catatan MongoDB:"
    echo "   - Cek process: sudo ps aux | grep mongod"
    echo "   - Cek port: sudo ss -tlnp | grep 27017"
    echo ""
    echo "Langkah Selanjutnya:"
    echo "   1. Copy 'env.example' ke 'env' dan edit konfigurasi"
    echo "   2. Aktifkan virtual environment: source venv/bin/activate"
    echo "   3. Build native addon: npm run build:addon"
    echo "   4. Aktifkan mongoDB shell: mongosh"
    echo "   4a. Jika mongoDB error gunakan sudo bash mongo.sh"
    echo "   5. Gunakan PM2 untuk manajemen proses jika diperlukan"
    echo "   6. Atau gunakan npm start untuk menjalankan aplikasi"
    echo ""
    echo "Catatan:"
    echo "   Timezone: Asia/Jakarta"
    echo "   User: $ORIGINAL_USER"
    echo ""
    echo "==============================================================="
}

main() {
    clear
    echo "==============================================================="
    echo "         Universal VPS Setup Script for Ubuntu"
    echo "==============================================================="
    echo ""
    
    setup_privileges
    detect_os
    check_cpu_capabilities
    
    echo ""
    print_info "Instalasi akan dimulai dalam 3 detik..."
    print_warning "Tekan Ctrl+C untuk membatalkan"
    sleep 3
    echo ""
    
    update_system
    echo ""
    
    install_base_dependencies
    echo ""
    
    install_mongodb
    echo ""
    
    install_redis
    echo ""
    
    install_python
    echo ""
    
    install_nodejs
    echo ""
    
    install_multimedia_tools
    echo ""
    
    install_speedtest
    echo ""
    
    setup_timezone
    echo ""
    
    setup_venv
    echo ""
    
    install_npm_globals
    echo ""
    
    install_project_dependencies
    echo ""
    
    install_playwright
    echo ""
    
    cleanup
    echo ""
    
    fix_permissions
    echo ""

    install_mongosh
    echo ""
    
    print_summary
}

main "$@"
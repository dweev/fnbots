#!/usr/bin/env bash

#==============================================================================
# Git Pull & Reset Script
# Memperbarui repository dengan git fetch, reset, dan pull
# Kompatibel dengan setup.sh dan update.sh
#==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step() { echo -e "${BLUE}🔧 $1${NC}"; }
print_git() { echo -e "${CYAN}📦 $1${NC}"; }

setup_privileges() {
    if [ "$EUID" -eq 0 ]; then
        SUDO_CMD=""
        ORIGINAL_USER="${SUDO_USER:-root}"
    elif command -v sudo >/dev/null 2>&1; then
        SUDO_CMD="sudo"
        ORIGINAL_USER="$USER"
    else
        SUDO_CMD=""
        ORIGINAL_USER="$USER"
    fi
}

check_git_installed() {
    print_step "Memeriksa Git installation..."
    
    if ! command -v git >/dev/null 2>&1; then
        print_error "Git tidak terinstall!"
        print_info "Install Git dengan: sudo apt-get install git"
        exit 1
    fi
    
    print_success "Git ditemukan: $(git --version)"
}

check_git_repository() {
    print_step "Memeriksa Git repository..."
    
    if [ ! -d ".git" ]; then
        print_error "Direktori ini bukan Git repository!"
        print_info "Inisialisasi repository dengan: git init"
        print_info "Atau clone repository: git clone <url>"
        exit 1
    fi
    
    print_success "Git repository valid"
}

check_remote_origin() {
    print_step "Memeriksa remote origin..."
    
    if ! git remote get-url origin >/dev/null 2>&1; then
        print_error "Remote 'origin' tidak ditemukan!"
        print_info "Tambahkan remote dengan: git remote add origin <url>"
        exit 1
    fi
    
    ORIGIN_URL=$(git remote get-url origin)
    print_success "Remote origin: $ORIGIN_URL"
}

get_current_branch() {
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    
    if [ "$CURRENT_BRANCH" = "unknown" ]; then
        print_warning "Tidak dapat mendeteksi branch saat ini"
        CURRENT_BRANCH="master"
    fi
    
    print_info "Branch saat ini: $CURRENT_BRANCH"
}

show_current_status() {
    print_step "Status repository saat ini..."
    echo ""
    
    CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    CURRENT_MESSAGE=$(git log -1 --pretty=%B 2>/dev/null | head -n 1 || echo "No commits")
    
    echo "   📍 Branch:  $CURRENT_BRANCH"
    echo "   🔖 Commit:  $CURRENT_COMMIT"
    echo "   📝 Message: $CURRENT_MESSAGE"
    echo ""
    
    if git status --porcelain 2>/dev/null | grep -q .; then
        print_warning "Ada perubahan lokal yang belum di-commit:"
        git status --short
        echo ""
    fi
}

backup_local_changes() {
    if git status --porcelain 2>/dev/null | grep -q .; then
        print_warning "Ditemukan perubahan lokal!"
        print_info "Perubahan lokal akan hilang setelah reset"
        echo ""
        
        read -p "$(echo -e ${YELLOW}⚠️  Lanjutkan dan hapus perubahan lokal? [y/N]:${NC} )" -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Operasi dibatalkan oleh user"
            print_info "Tips: Simpan perubahan dengan 'git stash' terlebih dahulu"
            exit 0
        fi
        
        print_step "Membuat backup perubahan lokal ke git stash..."
        if git stash save "Backup sebelum pull.sh - $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null; then
            print_success "Perubahan lokal berhasil di-backup ke stash"
            print_info "Restore dengan: git stash pop"
        else
            print_warning "Gagal membuat backup, melanjutkan tanpa backup"
        fi
        echo ""
    fi
}

fetch_from_origin() {
    print_step "Mengambil update dari remote origin..."
    
    if git fetch origin 2>&1; then
        print_success "Fetch dari origin berhasil"
    else
        print_error "Gagal fetch dari origin!"
        print_info "Periksa koneksi internet dan akses ke repository"
        exit 1
    fi
}

reset_to_origin() {
    print_step "Mereset repository ke origin/$CURRENT_BRANCH..."
    
    if git reset --hard "origin/$CURRENT_BRANCH" 2>&1; then
        print_success "Reset ke origin/$CURRENT_BRANCH berhasil"
    else
        print_error "Gagal reset ke origin/$CURRENT_BRANCH!"
        print_info "Branch mungkin tidak ada di remote"
        exit 1
    fi
}

pull_from_origin() {
    print_step "Melakukan git pull dari origin..."
    
    if git pull origin "$CURRENT_BRANCH" 2>&1; then
        print_success "Pull dari origin/$CURRENT_BRANCH berhasil"
    else
        print_warning "Pull mengalami masalah, tapi reset sudah dilakukan"
    fi
}

show_update_summary() {
    print_step "Menampilkan hasil update..."
    echo ""
    
    NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    NEW_MESSAGE=$(git log -1 --pretty=%B 2>/dev/null | head -n 1 || echo "No commits")
    
    echo "   📍 Branch:  $CURRENT_BRANCH"
    echo "   🔖 Commit:  $NEW_COMMIT"
    echo "   📝 Message: $NEW_MESSAGE"
    echo ""
}

show_commit_log() {
    print_step "Menampilkan 5 commit terakhir..."
    echo ""
    
    git log --oneline --decorate --graph -n 5 || print_warning "Tidak dapat menampilkan log"
    echo ""
}

fix_permissions() {
    if [ "$ORIGINAL_USER" != "root" ] && [ -n "$ORIGINAL_USER" ]; then
        print_step "Memperbaiki permissions folder..."
        if [ -n "$SUDO_CMD" ]; then
            $SUDO_CMD chown -R "$ORIGINAL_USER:$ORIGINAL_USER" .
            print_success "Permissions berhasil diperbaiki untuk user: $ORIGINAL_USER"
        fi
    fi
}

print_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    print_success "GIT PULL SELESAI!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📦 Repository Information:"
    echo "   • Remote:  $ORIGIN_URL"
    echo "   • Branch:  $CURRENT_BRANCH"
    echo "   • Commit:  $(git rev-parse --short HEAD)"
    echo ""
    echo "💡 Perintah Git yang berguna:"
    echo "   • Lihat status:    git status"
    echo "   • Lihat log:       git log --oneline -n 10"
    echo "   • Lihat diff:      git diff HEAD~1"
    echo "   • Restore stash:   git stash pop"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

main() {
    clear
    echo "═══════════════════════════════════════════════════════════════"
    echo "         Git Pull & Reset Script"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    setup_privileges
    
    check_git_installed
    echo ""
    
    check_git_repository
    echo ""
    
    check_remote_origin
    echo ""
    
    get_current_branch
    echo ""
    
    show_current_status
    
    backup_local_changes
    
    print_info "Pull akan dimulai dalam 3 detik..."
    print_warning "Tekan Ctrl+C untuk membatalkan"
    sleep 3
    echo ""
    
    fetch_from_origin
    echo ""
    
    reset_to_origin
    echo ""
    
    pull_from_origin
    echo ""
    
    show_update_summary
    
    show_commit_log
    
    fix_permissions
    echo ""
    
    print_summary
}

main "$@"
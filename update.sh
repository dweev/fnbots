#!/usr/bin/env bash

set -e

if [ "$EUID" -eq 0 ]; then
  echo "✅ Menjalankan script sebagai root"
elif command -v sudo >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    echo "✅ Menjalankan script sebagai user dengan akses sudo"
  else
    echo "❌ User '$USER' tidak memiliki akses sudo passwordless. Jalankan dengan 'sudo' atau sebagai root."
    exit 1
  fi
else
  echo "❌ Script harus dijalankan sebagai root atau user dengan sudo."
  exit 1
fi

ORIGINAL_USER=$(logname)
USER_HOME=$(getent passwd "$ORIGINAL_USER" | cut -d: -f6)

echo ""
echo "🐍 Memulai update pip dan package Python..."

if [ ! -d "venv" ]; then
  echo "❌ Virtual environment 'venv' tidak ditemukan!"
  echo "💡 Pastikan Anda sudah menjalankan setup.sh terlebih dahulu atau virtual environment sudah dibuat."
  exit 1
fi

if [ ! -f "venv/bin/pip" ]; then
  echo "❌ Pip tidak ditemukan di virtual environment!"
  exit 1
fi

echo ""
echo "📦 Mengupdate pip, setuptools, dan wheel..."
venv/bin/pip install --upgrade pip setuptools wheel

echo ""
echo "📦 Mengupdate package Python yang penting..."
venv/bin/pip install --upgrade \
  yt-dlp \
  google-generativeai \
  python-dotenv \
  ffmpeg-python \
  "g4f[all]" \
  rembg \
  Pillow \
  sticker-convert

echo ""
echo "📦 Mengupdate yt-dlp versi terbaru dari GitHub..."
venv/bin/pip install -U "yt-dlp @ git+https://github.com/yt-dlp/yt-dlp.git"

echo ""
echo "📋 Menampilkan versi package yang terinstall..."
echo "=== Versi Package Terinstall ==="
venv/bin/pip list | grep -E "(yt-dlp|google-generativeai|python-dotenv|ffmpeg-python|g4f|rembg|Pillow|sticker-convert)"

echo ""
echo "🧹 Membersihkan cache pip..."
venv/bin/pip cache purge

echo ""
echo "🔐 Mengembalikan kepemilikan folder ke semula..."
sudo chown -R $(logname) .

echo ""
echo "✅ Update pip dan package Python selesai!"
echo "💡 Jalankan 'source venv/bin/activate' untuk mulai menggunakan virtual environment Python yang sudah diupdate."
#!/usr/bin/env bash
# Install the apparel competition into $HOME/sweater on Ubuntu.
# Run as your normal user from any directory: bash setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/sweater}"
REPO="https://github.com/veddegre/sweater.git"
NODE_MAJOR_MIN=22
NODE_MINOR_MIN=13
SERVICE_NAME="sweater.service"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this as your normal user, not root." >&2
  exit 1
fi

log() { printf '\n%s\n' "$1"; }

need_apt() {
  local missing=()
  local cmd
  for cmd in git curl sha256sum tar; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    return
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    echo "Install these packages, then run this script again: git curl ca-certificates xz-utils coreutils" >&2
    exit 1
  fi
  log "Installing git, curl, and archive tools"
  sudo apt-get update
  sudo apt-get install -y git curl ca-certificates xz-utils coreutils
}

node_is_new_enough() {
  command -v node >/dev/null 2>&1 || return 1
  local version major minor
  version="$(node -v | sed 's/^v//')"
  major="${version%%.*}"
  minor="$(printf '%s' "$version" | cut -d. -f2)"
  [[ "$major" -gt "$NODE_MAJOR_MIN" ]] && return 0
  [[ "$major" -eq "$NODE_MAJOR_MIN" && "$minor" -ge "$NODE_MINOR_MIN" ]]
}

install_node() {
  local arch nodearch tmp tarball
  case "$(uname -m)" in
    x86_64) nodearch="x64" ;;
    aarch64 | arm64) nodearch="arm64" ;;
    *)
      echo "This script does not know how to install Node for $(uname -m)." >&2
      exit 1
      ;;
  esac
  log "Installing Node.js 24 into $HOME/.local"
  tmp="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  tarball="$(awk -v arch="$nodearch" '$2 ~ "linux-" arch "\\.tar\\.xz$" { print $2; exit }' "$tmp/SHASUMS256.txt")"
  if [[ -z "$tarball" ]]; then
    echo "Could not find a Node.js 24 build for linux-$nodearch." >&2
    exit 1
  fi
  curl -fsSL "https://nodejs.org/dist/latest-v24.x/${tarball}" -o "$tmp/$tarball"
  (
    cd "$tmp"
    grep " ${tarball}$" SHASUMS256.txt | sha256sum -c -
  )
  mkdir -p "$HOME/.local"
  tar -xJf "$tmp/$tarball" -C "$HOME/.local" --strip-components=1
  rm -rf "$tmp"
  local path_line='export PATH="$HOME/.local/bin:$PATH"'
  if [[ -f "$HOME/.bashrc" ]] && grep -Fqs '.local/bin' "$HOME/.bashrc"; then
    :
  else
    printf '\n%s\n' "$path_line" >> "$HOME/.bashrc"
  fi
  export PATH="$HOME/.local/bin:$PATH"
  hash -r
}

ensure_node() {
  export PATH="$HOME/.local/bin:$PATH"
  if node_is_new_enough; then
    log "Node.js $(node -v) is already installed"
    return
  fi
  if command -v node >/dev/null 2>&1; then
    log "Node.js $(node -v) is too old. This app needs Node.js 22.13 or newer."
  else
    log "Node.js is not installed"
  fi
  install_node
  if ! node_is_new_enough; then
    echo "Node.js install finished, but $(node -v 2>/dev/null || echo 'node') is still too old." >&2
    exit 1
  fi
  log "Installed Node.js $(node -v)"
}

place_app() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  mkdir -p "$APP_DIR"
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Updating $APP_DIR"
    git -C "$APP_DIR" pull --ff-only
    return
  fi
  if [[ -f "$script_dir/package.json" && "$script_dir" != "$APP_DIR" ]] && grep -q '"holiday-sweater-contest"' "$script_dir/package.json"; then
    log "Copying the app into $APP_DIR"
    mkdir -p "$APP_DIR"
    tar -C "$script_dir" \
      --exclude node_modules \
      --exclude .next \
      --exclude data \
      --exclude .env.local \
      --exclude .git \
      -cf - . | tar -C "$APP_DIR" -xf -
    return
  fi
  if [[ -f "$APP_DIR/package.json" ]]; then
    log "Using the existing files in $APP_DIR"
    return
  fi
  log "Cloning $REPO"
  echo "The GitHub repo is private. If clone asks you to sign in, use a personal access token as the password."
  git clone "$REPO" "$APP_DIR"
}

write_env() {
  local env_file="$APP_DIR/.env.local"
  if [[ -f "$env_file" ]]; then
    chmod 600 "$env_file"
    log "Kept the existing $env_file"
    return
  fi
  if [[ ! -t 0 ]]; then
    echo "Create $env_file with ADMIN_PASSWORD and SESSION_SECRET, run chmod 600 on it, then run this script again." >&2
    exit 1
  fi
  local password secret
  read -r -s -p "Admin password for /admin: " password
  echo
  if [[ -z "$password" ]]; then
    echo "The admin password cannot be empty." >&2
    exit 1
  fi
  secret="$(openssl rand -hex 32)"
  umask 077
  cat > "$env_file" << EOF
ADMIN_PASSWORD=${password}
SESSION_SECRET=${secret}
EOF
  chmod 600 "$env_file"
  log "Wrote $env_file (only your user can read it)"
}

install_deps() {
  log "Installing dependencies and building"
  cd "$APP_DIR"
  npm ci
  npm run build
}

set_permissions() {
  mkdir -p "$APP_DIR/data/uploads"
  chmod 700 "$APP_DIR/data" "$APP_DIR/data/uploads"
  if [[ -f "$APP_DIR/.env.local" ]]; then
    chmod 600 "$APP_DIR/.env.local"
  fi
  chmod 755 "$APP_DIR"
}

install_service() {
  local unit_dir="$HOME/.config/systemd/user"
  local node_bin npm_bin
  node_bin="$(command -v node)"
  npm_bin="$(command -v npm)"
  mkdir -p "$unit_dir"
  cat > "$unit_dir/$SERVICE_NAME" << EOF
[Unit]
Description=IT apparel competition
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PATH=${HOME}/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${npm_bin} start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
  chmod 644 "$unit_dir/$SERVICE_NAME"
  if command -v sudo >/dev/null 2>&1; then
    sudo loginctl enable-linger "$USER" || true
  fi
  if ! systemctl --user daemon-reload; then
    echo "Could not start a user service. From $APP_DIR run: npm start -- --hostname 127.0.0.1 --port 3000" >&2
    return
  fi
  systemctl --user enable --now "$SERVICE_NAME"
  log "The app is running on http://127.0.0.1:3000"
  echo "Point the Cloudflare tunnel at http://127.0.0.1:3000"
  echo "Node binary: $node_bin"
}

need_apt
ensure_node
if ! command -v openssl >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get install -y openssl
  else
    echo "Install openssl, then run this script again." >&2
    exit 1
  fi
fi
place_app
write_env
install_deps
set_permissions
install_service

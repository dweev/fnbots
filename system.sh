#!/bin/bash
# ─── Info ───────────────────────────────────────
# Created with ❤️ and 💦 By FN
# Follow https://github.com/Terror-Machine
# Feel Free To Use
# ─── Info system.sh ─────────────────────────────

WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVICE_PATH="/etc/systemd/system/fnbots.service"
CLI_PATH="/usr/local/bin/bot"

echo "Detected project directory: $WORKDIR"
echo "Creating FN WhatsApp Bot systemd service..."

PM2_PATH=$(which pm2 2>/dev/null || echo "/usr/bin/pm2")

CURRENT_USER="${SUDO_USER:-$USER}"

sudo tee $SERVICE_PATH > /dev/null <<EOF
[Unit]
Description=FN WhatsApp Bot (via PM2)
After=network.target

[Service]
Type=forking
User=$CURRENT_USER
WorkingDirectory=$WORKDIR
Environment=NODE_ENV=production
ExecStart=$PM2_PATH resurrect
ExecReload=$PM2_PATH restart fnbots
ExecStop=$PM2_PATH stop fnbots
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "Systemd unit created: $SERVICE_PATH"

echo "Creating FN Bot CLI controller..."
sudo tee $CLI_PATH > /dev/null <<EOF
#!/bin/bash

SERVICE_NAME="fnbots"
PM2_NAME="fnbots"

# Auto-detect project directory
if [ -f "/usr/local/bin/.fnbots_path" ]; then
  WORKDIR=\$(cat /usr/local/bin/.fnbots_path)
else
  # Try to find project directory
  SEARCH_PATHS=(
    "$WORKDIR"
    "\$HOME/fnbots"
    "/root/fnbots"
    "/home/*/fnbots"
    "\$(pwd)"
  )
  
  for path in "\${SEARCH_PATHS[@]}"; do
    if [ -d "\$path" ] && [ -f "\$path/package.json" ]; then
      WORKDIR="\$path"
      break
    fi
  done
  
  # If still not found, ask user
  if [ ! -d "\$WORKDIR" ] || [ ! -f "\$WORKDIR/package.json" ]; then
    echo "ERROR: Project directory not found!"
    echo "Please run this installer from the project directory first."
    exit 1
  fi
fi

HAS_PM2=\$(command -v pm2 >/dev/null 2>&1 && echo true || echo false)
HAS_SYSTEMD=\$(pidof systemd >/dev/null 2>&1 && echo true || echo false)

function info() {
  echo "─────────────────────────────"
  echo "FN Universal Bot Controller"
  echo "─────────────────────────────"
  echo "Service: \$SERVICE_NAME"
  echo "Location: \$WORKDIR"
  echo "Detected:"
  echo " - PM2: \$HAS_PM2"
  echo " - Systemd: \$HAS_SYSTEMD"
  echo "─────────────────────────────"
}

function start_bot() {
  echo "Checking for running instances..."
  
  if [ "\$HAS_SYSTEMD" = "true" ]; then
    SYSTEMD_ACTIVE=\$(systemctl is-active \$SERVICE_NAME 2>/dev/null)
    if [ "\$SYSTEMD_ACTIVE" = "active" ]; then
      echo "Stopping systemd service..."
      systemctl stop \$SERVICE_NAME
    fi
  fi
  
  if [ "\$HAS_PM2" = "true" ]; then
    PM2_STATUS=\$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"\$PM2_NAME\"" | wc -l)
    if [ "\$PM2_STATUS" -gt 0 ]; then
      echo "Stopping PM2 instance..."
      pm2 delete \$PM2_NAME 2>/dev/null
    fi
  fi
  
  if command -v screen >/dev/null 2>&1; then
    SCREEN_SESSIONS=\$(screen -ls | grep -E "fnbots?|bot" | awk '{print \$1}' | cut -d'.' -f1)
    if [ -n "\$SCREEN_SESSIONS" ]; then
      echo "Killing screen sessions..."
      echo "\$SCREEN_SESSIONS" | while read -r session; do
        screen -S "\$session" -X quit 2>/dev/null
        echo "  Killed screen: \$session"
      done
    fi
  fi
  
  if command -v tmux >/dev/null 2>&1; then
    TMUX_SESSIONS=\$(tmux list-sessions 2>/dev/null | grep -E "fnbots?|bot" | cut -d':' -f1)
    if [ -n "\$TMUX_SESSIONS" ]; then
      echo "Killing tmux sessions..."
      echo "\$TMUX_SESSIONS" | while read -r session; do
        tmux kill-session -t "\$session" 2>/dev/null
        echo "  Killed tmux: \$session"
      done
    fi
  fi
  
  NODE_PIDS=\$(pgrep -f "node.*\$WORKDIR")
  if [ -n "\$NODE_PIDS" ]; then
    echo "Killing Node processes..."
    echo "\$NODE_PIDS" | while read -r pid; do
      kill -9 \$pid 2>/dev/null
      echo "  Killed PID: \$pid"
    done
    sleep 1
  fi
  
  if [ "\$HAS_PM2" = "true" ]; then
    echo "Starting via PM2..."
    cd \$WORKDIR
    pm2 start ecosystem.config.cjs --only \$PM2_NAME
    pm2 save --force
    echo "Bot started. Use 'pm2 logs \$PM2_NAME' to view logs."
  elif [ "\$HAS_SYSTEMD" = "true" ]; then
    echo "Starting via systemd..."
    systemctl start \$SERVICE_NAME
  else
    echo "PM2 not found. Starting via npm..."
    cd \$WORKDIR && npm start &
  fi
}

function stop_bot() {
  STOPPED=false
  
  if [ "\$HAS_SYSTEMD" = "true" ]; then
    SYSTEMD_ACTIVE=\$(systemctl is-active \$SERVICE_NAME 2>/dev/null)
    if [ "\$SYSTEMD_ACTIVE" = "active" ]; then
      echo "Stopping systemd..."
      systemctl stop \$SERVICE_NAME
      STOPPED=true
    fi
  fi
  
  if [ "\$HAS_PM2" = "true" ]; then
    PM2_STATUS=\$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"\$PM2_NAME\"" | wc -l)
    if [ "\$PM2_STATUS" -gt 0 ]; then
      echo "Stopping PM2..."
      pm2 delete \$PM2_NAME 2>/dev/null
      STOPPED=true
    fi
  fi
  
  if command -v screen >/dev/null 2>&1; then
    SCREEN_SESSIONS=\$(screen -ls | grep -E "fnbots?|bot" | awk '{print \$1}' | cut -d'.' -f1)
    if [ -n "\$SCREEN_SESSIONS" ]; then
      echo "Killing screen sessions..."
      echo "\$SCREEN_SESSIONS" | while read -r session; do
        screen -S "\$session" -X quit 2>/dev/null
      done
      STOPPED=true
    fi
  fi
  
  if command -v tmux >/dev/null 2>&1; then
    TMUX_SESSIONS=\$(tmux list-sessions 2>/dev/null | grep -E "fnbots?|bot" | cut -d':' -f1)
    if [ -n "\$TMUX_SESSIONS" ]; then
      echo "Killing tmux sessions..."
      echo "\$TMUX_SESSIONS" | while read -r session; do
        tmux kill-session -t "\$session" 2>/dev/null
      done
      STOPPED=true
    fi
  fi
  
  NODE_PIDS=\$(pgrep -f "node.*\$WORKDIR")
  if [ -n "\$NODE_PIDS" ]; then
    echo "Killing Node processes..."
    echo "\$NODE_PIDS" | xargs kill -9 2>/dev/null
    STOPPED=true
  fi
  
  if [ "\$STOPPED" = false ]; then
    echo "Bot is not running."
  else
    echo "All instances stopped."
  fi
}

function restart_bot() {
  echo "Restarting bot..."
  stop_bot
  sleep 2
  start_bot
}

function reload_bot() {
  if [ "\$HAS_PM2" = "true" ]; then
    echo "Reloading via PM2..."
    pm2 reload \$PM2_NAME
  else
    echo "Reloading (full restart)..."
    restart_bot
  fi
}

function restart_fast() {
  echo "Force restarting..."
  
  if [ "\$HAS_SYSTEMD" = "true" ]; then
    systemctl stop \$SERVICE_NAME 2>/dev/null
  fi
  
  if [ "\$HAS_PM2" = "true" ]; then
    pm2 delete \$PM2_NAME 2>/dev/null
  fi
  
  if command -v screen >/dev/null 2>&1; then
    screen -ls | grep -E "fnbots?|bot" | awk '{print \$1}' | cut -d'.' -f1 | xargs -I {} screen -S {} -X quit 2>/dev/null
  fi
  
  if command -v tmux >/dev/null 2>&1; then
    tmux list-sessions 2>/dev/null | grep -E "fnbots?|bot" | cut -d':' -f1 | xargs -I {} tmux kill-session -t {} 2>/dev/null
  fi
  
  pkill -9 -f "node.*\$WORKDIR" 2>/dev/null
  sleep 1
  
  start_bot
}

function status_bot() {
  local DETAILED=false
  
  for arg in "\$@"; do
    case "\$arg" in
      -d|--detailed) DETAILED=true ;;
    esac
  done
  
  if [ "\$DETAILED" = true ]; then
    if [ "\$HAS_PM2" = "true" ]; then
      PM2_JSON=\$(pm2 jlist 2>/dev/null)
      PM2_INFO=\$(echo "\$PM2_JSON" | grep -A 50 "\"name\":\"\$PM2_NAME\"")
      
      if [ -n "\$PM2_INFO" ]; then
        echo "═══════════════════════════════"
        echo "FN Bot - Detailed Status"
        echo "═══════════════════════════════"
        echo ""
        
        STATUS=\$(echo "\$PM2_INFO" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
        PID=\$(echo "\$PM2_INFO" | grep -o "\"pid\":[0-9]*" | cut -d':' -f2 | head -1)
        UPTIME=\$(echo "\$PM2_INFO" | grep -o "\"pm_uptime\":[0-9]*" | cut -d':' -f2)
        RESTARTS=\$(echo "\$PM2_INFO" | grep -o "\"restart_time\":[0-9]*" | cut -d':' -f2)
        MEMORY=\$(echo "\$PM2_INFO" | grep -o "\"memory\":[0-9]*" | cut -d':' -f2)
        CPU=\$(echo "\$PM2_INFO" | grep -o "\"cpu\":[0-9.]*" | cut -d':' -f2 | cut -d',' -f1)
        
        if [ -n "\$UPTIME" ]; then
          UPTIME_SEC=\$(( (\$(date +%s) - \$UPTIME / 1000) ))
          UPTIME_FMT=\$(date -u -d @"\$UPTIME_SEC" +'%H:%M:%S' 2>/dev/null || echo "\${UPTIME_SEC}s")
        else
          UPTIME_FMT="N/A"
        fi
        
        if [ -n "\$MEMORY" ]; then
          MEMORY_MB=\$((MEMORY / 1024 / 1024))
        else
          MEMORY_MB="N/A"
        fi
        
        echo "Status       : \$STATUS"
        echo "PID          : \$PID"
        echo "Uptime       : \$UPTIME_FMT"
        echo "Restarts     : \${RESTARTS:-0}"
        echo "Memory       : \${MEMORY_MB} MB"
        echo "CPU          : \${CPU:-0}%"
        echo ""
        echo "Script Path  : \$WORKDIR/core/main.js"
        echo "Working Dir  : \$WORKDIR"
        echo "Node Version : \$(node --version 2>/dev/null || echo 'N/A')"
        echo "Environment  : production"
        echo ""
        echo "Log Files:"
        echo "  Error : ~/.pm2/logs/\$PM2_NAME-error.log"
        echo "  Output: ~/.pm2/logs/\$PM2_NAME-out.log"
        echo ""
        echo "═══════════════════════════════"
        echo "Commands:"
        echo "  pm2 logs \$PM2_NAME"
        echo "  pm2 monit"
        echo "  bot logs"
        echo "═══════════════════════════════"
        return
      fi
    fi
    
    if [ "\$HAS_SYSTEMD" = "true" ]; then
      STATUS=\$(systemctl is-active \$SERVICE_NAME 2>/dev/null)
      if [ "\$STATUS" = "active" ]; then
        echo "═══════════════════════════════"
        echo "FN Bot - Detailed Status"
        echo "═══════════════════════════════"
        echo ""
        
        MAIN_PID=\$(systemctl show -p MainPID --value \$SERVICE_NAME)
        ACTIVE_TIME=\$(systemctl show -p ActiveEnterTimestamp --value \$SERVICE_NAME)
        MEMORY=\$(systemctl show -p MemoryCurrent --value \$SERVICE_NAME)
        
        if [ -n "\$MEMORY" ] && [ "\$MEMORY" != "[not set]" ]; then
          MEMORY_MB=\$((MEMORY / 1024 / 1024))
        else
          MEMORY_MB="N/A"
        fi
        
        echo "Status       : active (running)"
        echo "PID          : \$MAIN_PID"
        echo "Started      : \$ACTIVE_TIME"
        echo "Memory       : \${MEMORY_MB} MB"
        echo ""
        echo "Service File : /etc/systemd/system/\$SERVICE_NAME.service"
        echo "Working Dir  : \$WORKDIR"
        echo ""
        echo "═══════════════════════════════"
        echo "Commands:"
        echo "  systemctl status \$SERVICE_NAME"
        echo "  journalctl -u \$SERVICE_NAME -f"
        echo "  bot logs"
        echo "═══════════════════════════════"
        return
      fi
    fi
    
    echo "Bot not running in systemd or PM2"
    return
  fi
  
  echo "─────────────────────────────"
  echo "FN Bot Status Monitor"
  echo "─────────────────────────────"
  
  RUNNING=false

  if [ "\$HAS_SYSTEMD" = "true" ]; then
    STATUS=\$(systemctl is-active \$SERVICE_NAME 2>/dev/null)
    if [ "\$STATUS" = "active" ]; then
      echo "Systemd: Active"
      MAIN_PID=\$(systemctl show -p MainPID --value \$SERVICE_NAME)
      echo "  PID: \$MAIN_PID"
      RUNNING=true
    fi
  fi

  if [ "\$HAS_PM2" = "true" ]; then
    PM2_INFO=\$(pm2 jlist 2>/dev/null | grep -A 10 "\"name\":\"\$PM2_NAME\"")
    if [ -n "\$PM2_INFO" ]; then
      PM2_STATUS=\$(echo "\$PM2_INFO" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
      PM2_PID=\$(echo "\$PM2_INFO" | grep -o "\"pid\":[0-9]*" | cut -d':' -f2)
      PM2_UPTIME=\$(echo "\$PM2_INFO" | grep -o "\"pm_uptime\":[0-9]*" | cut -d':' -f2)
      
      echo "PM2: \$PM2_STATUS"
      if [ -n "\$PM2_PID" ] && [ "\$PM2_PID" != "0" ]; then
        echo "  PID: \$PM2_PID"
        if [ -n "\$PM2_UPTIME" ]; then
          UPTIME_SEC=\$(( (\$(date +%s) - \$PM2_UPTIME / 1000) ))
          echo "  Uptime: \$(date -u -d @"\$UPTIME_SEC" +'%H:%M:%S' 2>/dev/null || echo "\${UPTIME_SEC}s")"
        fi
        RUNNING=true
      fi
    fi
  fi

  if command -v screen >/dev/null 2>&1; then
    SCREEN_SESSIONS=\$(screen -ls 2>/dev/null | grep -E "fnbots?|bot" | awk '{print \$1}')
    if [ -n "\$SCREEN_SESSIONS" ]; then
      echo "Screen: Running"
      echo "\$SCREEN_SESSIONS" | while read -r session; do
        echo "  Session: \$session"
      done
      RUNNING=true
    fi
  fi

  if command -v tmux >/dev/null 2>&1; then
    TMUX_SESSIONS=\$(tmux list-sessions 2>/dev/null | grep -E "fnbots?|bot")
    if [ -n "\$TMUX_SESSIONS" ]; then
      echo "Tmux: Running"
      echo "\$TMUX_SESSIONS" | while read -r session; do
        SESSION_NAME=\$(echo "\$session" | cut -d':' -f1)
        echo "  Session: \$SESSION_NAME"
      done
      RUNNING=true
    fi
  fi

  NODE_PIDS=\$(pgrep -f "node.*\$WORKDIR")
  if [ -n "\$NODE_PIDS" ]; then
    if [ "\$RUNNING" = false ]; then
      echo "Node (direct): Running"
      echo "\$NODE_PIDS" | while read -r pid; do
        UPTIME_SEC=\$(ps -p \$pid -o etimes= 2>/dev/null | xargs)
        echo "  PID: \$pid (uptime: \${UPTIME_SEC}s)"
      done
      RUNNING=true
    fi
  fi

  if [ "\$RUNNING" = false ]; then
    echo "Status: Not running"
  fi

  echo "─────────────────────────────"
  echo "Bot: \$SERVICE_NAME"
  echo "Path: \$WORKDIR"
  echo "─────────────────────────────"
  echo ""
  echo "Tip: Use 'bot status -d' for detailed output"
}

function logs_bot() {
  local LIMIT="\${1:-10}"
  local LOG_FILE="\$WORKDIR/logs/app_activity.log"

  if ! [[ "\$LIMIT" =~ ^[0-9]+\$ ]]; then
    LIMIT=10
  fi

  if [[ "\$LIMIT" -gt 50 ]]; then
    echo "Maksimal hanya bisa melihat 50 log terakhir."
    return 1
  fi

  if [[ ! -f "\$LOG_FILE" ]]; then
    echo "File log tidak ditemukan: \$LOG_FILE"
    return 1
  fi

  echo "Bot Log - Last \$LIMIT lines"
  echo "═══════════════════════════════════════"
  echo

  tail -n "\$LIMIT" "\$LOG_FILE"

  echo
}

function help_menu() {
  echo "Usage: bot {start|stop|restart|restart-fast|reload|status|logs|info}"
  echo
  echo "Commands:"
  echo "  start         Start the bot (kills all other instances, uses PM2)"
  echo "  stop          Stop all running instances"
  echo "  restart       Restart (stop + start)"
  echo "  restart-fast  Force restart (brutal kill + start)"
  echo "  reload        Reload service (PM2 zero-downtime reload)"
  echo "  status        Show compact status"
  echo "  status -d     Show detailed status (clean format, WhatsApp-friendly)"
  echo "  logs          Show last 10 logs from journal"
  echo "  logs <n>      Show last n logs from journal"
  echo "  info          Show detected mode and config"
}

case "\$1" in
  start) start_bot ;;
  stop) stop_bot ;;
  restart) restart_bot ;;
  restart-fast) restart_fast ;;
  reload) reload_bot ;;
  status) shift; status_bot "\$@" ;;
  logs) logs_bot "\$2" ;;
  info) info ;;
  *) help_menu ;;
esac
EOF

sudo chmod +x $CLI_PATH
echo "CLI controller created: $CLI_PATH"
echo "$WORKDIR" | sudo tee /usr/local/bin/.fnbots_path > /dev/null

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo ""
echo "Setup complete!"
echo ""
echo "Project directory detected at: $WORKDIR"
echo ""
echo "Usage:"
echo "  bot start    - Kill all instances, start fresh with PM2"
echo "  bot stop     - Stop all running instances"
echo "  bot restart  - Stop then start"
echo "  bot status   - Check what's running"
echo "  bot logs     - View PM2 logs"
echo ""
echo "You can also use directly:"
echo "  npm start / pnpm start  - Run in foreground"
echo "  pm2 start ...           - Manual PM2 start"
echo ""
echo "Note: 'bot start' will always kill other methods and use PM2"
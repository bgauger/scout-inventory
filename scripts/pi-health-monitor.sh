#!/bin/bash
# Scout Inventory System - Health Monitor
# Monitors system health and Docker containers

set -e

# Configuration
LOG_FILE="/var/log/scout-health.log"
ALERT_FILE="/tmp/scout-health-alert.txt"
MAX_LOG_SIZE=10485760  # 10MB

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    sudo mv "$LOG_FILE" "$LOG_FILE.old"
fi

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE" >/dev/null
}

log_echo() {
    echo "$1"
    log "$1"
}

# Start health check
log_echo "========================================"
log_echo "Scout Inventory Health Check"
log_echo "========================================"

ISSUES_FOUND=0

# Check 1: System Resources
log_echo ""
log_echo "1. System Resources"
log_echo "-------------------"

# CPU Load
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
log_echo "CPU Load (1min): $LOAD"

# Memory Usage
MEM_TOTAL=$(free -m | awk 'NR==2{print $2}')
MEM_USED=$(free -m | awk 'NR==2{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
log_echo "Memory: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PERCENT}%)"

if [ $MEM_PERCENT -gt 90 ]; then
    log_echo "⚠ WARNING: High memory usage!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Disk Usage
DISK_USED=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
log_echo "Disk Usage: ${DISK_USED}%"

if [ $DISK_USED -gt 85 ]; then
    log_echo "⚠ WARNING: High disk usage!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Temperature (Raspberry Pi specific)
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP=$(($(cat /sys/class/thermal/thermal_zone0/temp) / 1000))
    log_echo "CPU Temperature: ${TEMP}°C"

    if [ $TEMP -gt 70 ]; then
        log_echo "⚠ WARNING: High CPU temperature!"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

# Check 2: Network Connectivity
log_echo ""
log_echo "2. Network Connectivity"
log_echo "-----------------------"

# Local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
log_echo "Local IP: $LOCAL_IP"

# Internet connectivity
if ping -c 1 8.8.8.8 &> /dev/null; then
    log_echo "✓ Internet: Connected"
else
    log_echo "✗ Internet: Disconnected"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Tailscale status (if installed)
if command -v tailscale &> /dev/null; then
    if sudo tailscale status &> /dev/null; then
        TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "N/A")
        log_echo "✓ Tailscale: Connected ($TAILSCALE_IP)"
    else
        log_echo "✗ Tailscale: Not connected"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

# Check 3: Docker Service
log_echo ""
log_echo "3. Docker Service"
log_echo "-----------------"

if systemctl is-active --quiet docker; then
    log_echo "✓ Docker: Running"
else
    log_echo "✗ Docker: Not running"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 4: Docker Containers
log_echo ""
log_echo "4. Docker Containers"
log_echo "--------------------"

# Find docker-compose file
COMPOSE_FILE=""
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

if [ -n "$COMPOSE_FILE" ]; then
    log_echo "Using compose file: $COMPOSE_FILE"

    # Check each container
    CONTAINERS=("scout_db" "scout_api" "scout_web")

    for container in "${CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
            HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

            if [ "$STATUS" = "running" ]; then
                if [ "$HEALTH" = "none" ] || [ "$HEALTH" = "healthy" ]; then
                    log_echo "✓ $container: Running"
                else
                    log_echo "⚠ $container: Running but unhealthy ($HEALTH)"
                    ISSUES_FOUND=$((ISSUES_FOUND + 1))
                fi
            else
                log_echo "✗ $container: Not running ($STATUS)"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
        else
            log_echo "✗ $container: Not found"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    done
else
    log_echo "⚠ No docker-compose file found, skipping container check"
fi

# Check 5: Web Service
log_echo ""
log_echo "5. Web Service Connectivity"
log_echo "----------------------------"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_echo "✓ Web service: Responding (HTTP $HTTP_CODE)"
else
    log_echo "✗ Web service: Not responding (HTTP $HTTP_CODE)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 6: Database Connectivity
log_echo ""
log_echo "6. Database"
log_echo "-----------"

if docker ps --format '{{.Names}}' | grep -q "^scout_db$"; then
    if docker exec scout_db pg_isready -U postgres &> /dev/null; then
        log_echo "✓ Database: Accepting connections"
    else
        log_echo "✗ Database: Not accepting connections"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    log_echo "⚠ Database container not running"
fi

# Check 7: Recent Errors in Logs
log_echo ""
log_echo "7. Recent Container Errors"
log_echo "--------------------------"

if [ -n "$COMPOSE_FILE" ]; then
    # Check for errors in last 100 lines of logs
    ERROR_COUNT=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)

    if [ "$ERROR_COUNT" -gt 0 ]; then
        log_echo "⚠ Found $ERROR_COUNT error/exception messages in recent logs"
        # Show last 5 errors
        log_echo "Recent errors:"
        docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>/dev/null | grep -i "error\|exception\|fatal" | tail -5 | while read line; do
            log_echo "  $line"
        done
    else
        log_echo "✓ No recent errors in logs"
    fi
fi

# Summary
log_echo ""
log_echo "========================================"
log_echo "Health Check Summary"
log_echo "========================================"

if [ $ISSUES_FOUND -eq 0 ]; then
    log_echo "✓ Status: HEALTHY - No issues found"
    log_echo ""

    # Clean up alert file if exists
    [ -f "$ALERT_FILE" ] && rm -f "$ALERT_FILE"

    exit 0
else
    log_echo "⚠ Status: ISSUES FOUND - $ISSUES_FOUND problem(s) detected"
    log_echo ""
    log_echo "Please review the details above and take appropriate action."
    log_echo ""

    # Create alert file
    echo "Scout Inventory System has $ISSUES_FOUND issue(s)" > "$ALERT_FILE"
    echo "Last check: $(date)" >> "$ALERT_FILE"
    echo "Check log: $LOG_FILE" >> "$ALERT_FILE"

    exit 1
fi

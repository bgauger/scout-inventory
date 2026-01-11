#!/bin/bash
# Remote Access Setup Script for Raspberry Pi
# This script configures SSH, installs Tailscale, and hardens security

set -e

echo "========================================="
echo "Scout Inventory - Remote Access Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo "Please run as normal user with sudo privileges, not as root"
   exit 1
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✓${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Step 1: System Update"
echo "---------------------"
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y
echo_success "System updated"
echo ""

echo "Step 2: SSH Configuration"
echo "-------------------------"

# Backup SSH config
if [ ! -f /etc/ssh/sshd_config.backup ]; then
    echo "Backing up SSH config..."
    sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d-%H%M%S)
    echo_success "SSH config backed up"
fi

# Check if SSH keys are already set up
if [ ! -f ~/.ssh/authorized_keys ] || [ ! -s ~/.ssh/authorized_keys ]; then
    echo_warning "No SSH keys found in ~/.ssh/authorized_keys"
    echo ""
    echo "You need to add your public SSH key before we can disable password auth."
    echo "Run this command from your LOCAL machine:"
    echo ""
    echo "  ssh-copy-id $(whoami)@$(hostname -I | awk '{print $1}')"
    echo ""
    read -p "Have you added your SSH key? (yes/no): " key_added

    if [ "$key_added" != "yes" ]; then
        echo_warning "Skipping SSH hardening. Run this script again after adding your SSH key."
        SSH_CONFIGURED=false
    else
        SSH_CONFIGURED=true
    fi
else
    echo_success "SSH keys found"
    SSH_CONFIGURED=true
fi

if [ "$SSH_CONFIGURED" = true ]; then
    echo "Hardening SSH configuration..."

    # Create temporary config
    sudo tee /etc/ssh/sshd_config.d/hardening.conf > /dev/null <<EOF
# Disable password authentication (use keys only)
PasswordAuthentication no
PubkeyAuthentication yes

# Disable root login
PermitRootLogin no

# Disable empty passwords
PermitEmptyPasswords no

# Use only strong key exchange algorithms
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

# Use only strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# Use only strong MACs
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256

# Disable X11 forwarding
X11Forwarding no

# Set login grace time
LoginGraceTime 60

# Maximum authentication attempts
MaxAuthTries 3

# Maximum sessions
MaxSessions 10
EOF

    # Test SSH config
    if sudo sshd -t; then
        echo_success "SSH configuration is valid"
        sudo systemctl restart sshd
        echo_success "SSH service restarted with hardened configuration"
    else
        echo_error "SSH configuration test failed, reverting..."
        sudo rm /etc/ssh/sshd_config.d/hardening.conf
        exit 1
    fi
fi
echo ""

echo "Step 3: Firewall Configuration"
echo "-------------------------------"

if ! command_exists ufw; then
    echo "Installing UFW firewall..."
    sudo apt install -y ufw
    echo_success "UFW installed"
fi

echo "Configuring firewall rules..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp comment 'Web server'
sudo ufw --force enable

echo_success "Firewall configured and enabled"
echo ""

echo "Step 4: Tailscale Installation (Recommended VPN)"
echo "-------------------------------------------------"

read -p "Do you want to install Tailscale for remote access? (yes/no): " install_tailscale

if [ "$install_tailscale" = "yes" ]; then
    if command_exists tailscale; then
        echo_warning "Tailscale is already installed"
        sudo tailscale status || echo_warning "Tailscale not connected"
    else
        echo "Installing Tailscale..."
        curl -fsSL https://tailscale.com/install.sh | sh
        echo_success "Tailscale installed"
    fi

    echo ""
    echo "Starting Tailscale..."
    echo "Follow the authentication link that appears to connect this device."
    echo ""
    sudo tailscale up

    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "not available yet")
    echo ""
    echo_success "Tailscale configured"
    if [ "$TAILSCALE_IP" != "not available yet" ]; then
        echo "Your Tailscale IP: $TAILSCALE_IP"
        echo "You can SSH using: ssh $(whoami)@$TAILSCALE_IP"
        echo "You can access the app at: http://$TAILSCALE_IP"
    fi
fi
echo ""

echo "Step 5: Fail2Ban Installation (Brute Force Protection)"
echo "-------------------------------------------------------"

read -p "Do you want to install Fail2Ban for brute force protection? (yes/no): " install_fail2ban

if [ "$install_fail2ban" = "yes" ]; then
    if ! command_exists fail2ban-client; then
        echo "Installing Fail2Ban..."
        sudo apt install -y fail2ban
        echo_success "Fail2Ban installed"
    else
        echo_warning "Fail2Ban is already installed"
    fi

    # Configure Fail2Ban for SSH
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    echo_success "Fail2Ban configured and enabled"
fi
echo ""

echo "Step 6: Automatic Updates"
echo "-------------------------"

read -p "Enable automatic security updates? (yes/no): " enable_autoupdate

if [ "$enable_autoupdate" = "yes" ]; then
    echo "Installing unattended-upgrades..."
    sudo apt install -y unattended-upgrades

    sudo dpkg-reconfigure -plow unattended-upgrades
    echo_success "Automatic security updates enabled"
fi
echo ""

echo "Step 7: System Information"
echo "--------------------------"

LOCAL_IP=$(hostname -I | awk '{print $1}')
HOSTNAME=$(hostname)

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "System Information:"
echo "  Hostname: $HOSTNAME"
echo "  Local IP: $LOCAL_IP"

if command_exists tailscale && tailscale status &>/dev/null; then
    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "not connected")
    echo "  Tailscale IP: $TAILSCALE_IP"
fi

echo ""
echo "Access Methods:"
echo "  Local: ssh $(whoami)@$LOCAL_IP"

if [ -n "$TAILSCALE_IP" ] && [ "$TAILSCALE_IP" != "not connected" ]; then
    echo "  Remote: ssh $(whoami)@$TAILSCALE_IP"
    echo "  Web (remote): http://$TAILSCALE_IP"
fi

echo "  Web (local): http://$LOCAL_IP"
echo ""
echo "Security Features Enabled:"
[ "$SSH_CONFIGURED" = true ] && echo "  ✓ SSH key-based authentication"
[ "$SSH_CONFIGURED" = true ] && echo "  ✓ SSH hardening"
echo "  ✓ UFW firewall"
[ "$install_tailscale" = "yes" ] && echo "  ✓ Tailscale VPN"
[ "$install_fail2ban" = "yes" ] && echo "  ✓ Fail2Ban protection"
[ "$enable_autoupdate" = "yes" ] && echo "  ✓ Automatic security updates"
echo ""

if [ "$SSH_CONFIGURED" = true ]; then
    echo_warning "IMPORTANT: Password authentication is now disabled!"
    echo_warning "Make sure you can SSH using your key before closing this session!"
    echo ""
    echo "Test in a new terminal:"
    echo "  ssh $(whoami)@$LOCAL_IP"
    echo ""
fi

echo "Firewall Status:"
sudo ufw status
echo ""

echo "Next Steps:"
echo "1. Test SSH access from another terminal"
echo "2. Deploy the Scout Inventory application"
echo "3. Test remote access via Tailscale (if installed)"
echo "4. Document your IPs and access methods"
echo ""
echo "For more information, see RASPBERRY_PI_DEPLOYMENT.md"
echo ""

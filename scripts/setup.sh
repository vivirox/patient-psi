#!/bin/bash

echo "Setting up Patient PSI development environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "Redis not found. Installing Redis..."
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        sudo apt-get update
        sudo apt-get install -y redis-server
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS
        sudo yum install -y redis
    elif [ -f /etc/arch-release ]; then
        # Arch Linux
        sudo pacman -S redis
    else
        echo "Unsupported distribution. Please install Redis manually."
        exit 1
    fi
fi

# Start Redis if not running
if ! pgrep redis-server > /dev/null; then
    echo "Starting Redis server..."
    sudo systemctl start redis
fi

# Create .env if it doesn't exist
if [ ! -f "python/.env" ]; then
    echo "Creating .env file from template..."
    cp python/.env.example python/.env
    echo "Please update python/.env with your specific configuration."
fi

# Create log directory
mkdir -p logs

echo "Setup complete! Please ensure you have:"
echo "1. Updated python/.env with your specific configuration"
echo "2. Installed Ollama and have it running"
echo "3. Have the required model downloaded in Ollama"

# Verify Redis is working
echo -n "Testing Redis connection... "
if redis-cli ping > /dev/null; then
    echo "Success!"
else
    echo "Failed. Please check Redis installation."
fi

# Print current environment
echo -e "\nCurrent environment:"
echo "Python version: $(python --version)"
echo "Redis version: $(redis-server --version)"
echo "Ollama status: $(curl -s http://localhost:11434/api/version || echo 'Not running')"

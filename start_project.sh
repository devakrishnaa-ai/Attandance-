#!/bin/bash

# Formatting
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Project Setup...${NC}"

# Backend Setup
echo -e "${GREEN}Setting up Backend...${NC}"

# Check for python3
if ! command -v python3 &> /dev/null; then
    echo "python3 could not be found. Please install Python 3."
    exit 1
fi

PYTHON_BIN="venv/bin/python"
PIP_BIN="venv/bin/pip"

# Check if venv exists and is valid
if [ -d "venv" ]; then
    if [ ! -f "$PYTHON_BIN" ] || ! "$PYTHON_BIN" --version &> /dev/null; then
        echo "Detected broken virtual environment. Recreating..."
        rm -rf venv
        python3 -m venv venv
    else
        echo "Virtual environment found."
    fi
else
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Double check
if [ ! -f "$PYTHON_BIN" ]; then
    echo "Error: Failed to create virtual environment or find python binary."
    exit 1
fi

echo "Installing Python dependencies..."
"$PIP_BIN" install -r requirements.txt

echo "Running Migrations..."
"$PYTHON_BIN" manage.py migrate

# Frontend Setup
echo -e "${GREEN}Setting up Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
else
    echo "Node modules found. Skipping install (run 'npm install' manually if needed)."
fi

cd ..

echo -e "${GREEN}Setup Complete!${NC}"
echo ""
echo "To run the application, open two terminal windows:"
echo ""
echo "1. Backend:"
echo "   source venv/bin/activate"
echo "   python manage.py runserver"
echo ""
echo "2. Frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""

#!/bin/bash

# inDrive Admin Portal - Setup Validation Script
# This script checks if your environment is set up correctly

echo "=================================="
echo "🔍 inDrive Admin Portal Setup Check"
echo "=================================="
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Check npm
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found. Please install npm"
    exit 1
fi

# Check node_modules
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed. Run: npm install"
    exit 1
fi

# Check .env file
echo ""
echo "🔑 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Check for SUPABASE_URL
    if grep -q "VITE_SUPABASE_URL" .env; then
        SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env | cut -d '=' -f2)
        if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "" ]; then
            echo "⚠️  VITE_SUPABASE_URL is empty"
        else
            echo "✅ VITE_SUPABASE_URL configured"
        fi
    else
        echo "⚠️  VITE_SUPABASE_URL not found in .env"
    fi
    
    # Check for ADMIN_TOKEN
    if grep -q "VITE_ADMIN_TOKEN" .env; then
        ADMIN_TOKEN=$(grep "VITE_ADMIN_TOKEN" .env | cut -d '=' -f2)
        if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "" ]; then
            echo "⚠️  VITE_ADMIN_TOKEN is empty"
        else
            echo "✅ VITE_ADMIN_TOKEN configured"
        fi
    else
        echo "⚠️  VITE_ADMIN_TOKEN not found in .env"
    fi
else
    echo "❌ .env file not found. Run: cp .env.example .env"
    exit 1
fi

# Check required files
echo ""
echo "📄 Checking project structure..."
REQUIRED_FILES=(
    "package.json"
    "tsconfig.json"
    "vite.config.ts"
    "tailwind.config.js"
    "index.html"
    "src/App.tsx"
    "src/main.tsx"
    "src/index.css"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
    fi
done

# Check src folder structure
echo ""
echo "📁 Checking src folder structure..."
SRC_FOLDERS=(
    "src/components"
    "src/pages"
    "src/services"
)

for folder in "${SRC_FOLDERS[@]}"; do
    if [ -d "$folder" ]; then
        echo "✅ $folder/"
    else
        echo "❌ $folder/ missing"
    fi
done

# Summary
echo ""
echo "=================================="
echo "✅ Setup validation complete!"
echo "=================================="
echo ""
echo "🚀 Next steps:"
echo "1. npm run dev          (start development server)"
echo "2. Open http://localhost:3000"
echo "3. Check browser console for any errors"
echo ""
echo "📖 Documentation:"
echo "• README.md              - Full documentation"
echo "• QUICKSTART.md          - Quick start guide"
echo "• API_REFERENCE.md       - API documentation"
echo "• IMPLEMENTATION_GUIDE.md - Customization guide"
echo ""

#!/bin/bash
# POVibe — Start both server and client with one command
# Usage: ./start.sh

echo "🚀 Starting POVibe..."

# Kill any existing processes on our ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "📦 Starting server on port 8000..."
cd "$(dirname "$0")/server" && npm run dev &
SERVER_PID=$!

echo "🎨 Starting client on port 5173..."
cd "$(dirname "$0")/client" && npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ POVibe is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM
wait

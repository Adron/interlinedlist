#!/bin/bash

# Script to kill Next.js dev server processes and clean up lock files

echo "Finding Next.js dev server processes..."

# Find processes using port 3000
PORT_PIDS=$(lsof -ti:3000 2>/dev/null)

# Find Next.js dev processes
NEXT_PIDS=$(ps aux | grep -i "next dev" | grep -v grep | awk '{print $2}')

# Combine and deduplicate PIDs
ALL_PIDS=$(echo "$PORT_PIDS $NEXT_PIDS" | tr ' ' '\n' | sort -u | tr '\n' ' ')

if [ -z "$ALL_PIDS" ]; then
  echo "No Next.js dev server processes found."
else
  echo "Found processes: $ALL_PIDS"
  echo "Killing processes..."
  kill -9 $ALL_PIDS 2>/dev/null
  echo "Processes killed."
fi

# Remove lock file
if [ -f ".next/dev/lock" ]; then
  echo "Removing lock file..."
  rm -f .next/dev/lock
  echo "Lock file removed."
else
  echo "No lock file found."
fi

echo "Done! You can now run 'npm run dev' again."


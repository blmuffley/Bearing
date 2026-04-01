#!/bin/bash
# Add Avennorth local development aliases to /etc/hosts
# Run with: sudo bash scripts/setup-hosts.sh

set -e

if ! grep -q "bearing.local" /etc/hosts; then
  cat >> /etc/hosts << 'EOF'

# Avennorth Development Services
127.0.0.1  bearing.local       # Bearing API (port 8080)
127.0.0.1  bearing-ui.local    # Bearing Prototype UI (port 4201)
127.0.0.1  pathfinder.local    # Pathfinder Gateway (port 4200)
127.0.0.1  contour.local       # Contour UI (port 4202)
EOF
  echo "Added Avennorth hosts entries."
else
  echo "Avennorth hosts entries already present."
fi

echo ""
echo "Local services:"
echo "  bearing.local       → http://localhost:8080  (API)"
echo "  bearing-ui.local    → http://localhost:4201  (Prototype)"
echo "  pathfinder.local    → http://localhost:4200  (Pathfinder)"
echo "  contour.local       → http://localhost:4202  (Contour)"

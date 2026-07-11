#!/bin/bash

# Get admin token (you'll need to replace this with your actual admin token)
TOKEN=$(cat <<'TOKENEOF'
# Replace this with your admin JWT token from localStorage
# You can get it from the browser console: localStorage.getItem('token')
TOKENEOF
)

echo "Fixing invalid task dependencies..."
echo ""
echo "Step 1: Checking for issues..."
curl -X GET "http://localhost:3000/api/admin/fix-dependencies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo ""
echo "Step 2: Fixing issues..."
curl -X POST "http://localhost:3000/api/admin/fix-dependencies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "Done! Refresh your browser to see the changes."

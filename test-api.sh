#!/bin/bash

# Contacts Sync Backend - API Testing Script
# This script helps test all major API endpoints

BASE_URL="${1:-http://localhost:3000}"
API_KEY=""

echo "================================================"
echo "Contacts Sync Backend - API Test Script"
echo "================================================"
echo ""
echo "Testing server at: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test health endpoint
echo "1. Testing Health Endpoint..."
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi
echo ""

# Register a test agent
echo "2. Registering Test Agent..."
response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "agent_code": "TEST_AGENT_'$(date +%s)'",
        "agent_name": "Test Agent"
    }')

if echo "$response" | grep -q "success.*true"; then
    API_KEY=$(echo "$response" | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Agent registered successfully${NC}"
    echo "API Key: $API_KEY"
else
    echo -e "${RED}✗ Failed to register agent${NC}"
    echo "Response: $response"
    exit 1
fi
echo ""

# Verify API key
echo "3. Verifying API Key..."
response=$(curl -s "$BASE_URL/api/auth/verify" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ API key verified${NC}"
else
    echo -e "${RED}✗ API key verification failed${NC}"
    exit 1
fi
echo ""

# Create a test contact
echo "4. Creating Test Contact..."
CONTACT_ID=""
response=$(curl -s -X POST "$BASE_URL/api/contacts" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d '{
        "first_name": "John",
        "last_name": "Doe",
        "phone_primary": "+1234567890",
        "phone_secondary": "+0987654321"
    }')

if echo "$response" | grep -q "success.*true"; then
    CONTACT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓ Contact created successfully${NC}"
    echo "Contact ID: $CONTACT_ID"
else
    echo -e "${RED}✗ Failed to create contact${NC}"
    exit 1
fi
echo ""

# List contacts
echo "5. Listing Contacts..."
response=$(curl -s "$BASE_URL/api/contacts?limit=10" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    count=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ Contacts listed successfully${NC}"
    echo "Total contacts: $count"
else
    echo -e "${RED}✗ Failed to list contacts${NC}"
    exit 1
fi
echo ""

# Get single contact
echo "6. Getting Single Contact..."
response=$(curl -s "$BASE_URL/api/contacts/$CONTACT_ID" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Contact retrieved successfully${NC}"
else
    echo -e "${RED}✗ Failed to get contact${NC}"
    exit 1
fi
echo ""

# Update contact
echo "7. Updating Contact..."
response=$(curl -s -X PUT "$BASE_URL/api/contacts/$CONTACT_ID" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d '{
        "first_name": "Jane",
        "last_name": "Smith"
    }')

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Contact updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to update contact${NC}"
    exit 1
fi
echo ""

# Search contacts
echo "8. Searching Contacts..."
response=$(curl -s "$BASE_URL/api/contacts?q=Jane" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Search successful${NC}"
else
    echo -e "${RED}✗ Search failed${NC}"
    exit 1
fi
echo ""

# Get delta sync
echo "9. Testing Delta Sync..."
response=$(curl -s "$BASE_URL/api/sync/delta?version=0&device_id=test_device" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    current_version=$(echo "$response" | grep -o '"current_version":[0-9]*' | cut -d':' -f2)
    changes_count=$(echo "$response" | grep -o '"changes":\[[^]]*\]' | grep -o '\[' | wc -l)
    echo -e "${GREEN}✓ Delta sync successful${NC}"
    echo "Current version: $current_version"
else
    echo -e "${RED}✗ Delta sync failed${NC}"
    exit 1
fi
echo ""

# Get device health
echo "10. Getting Device Health..."
response=$(curl -s "$BASE_URL/api/devices/health" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Device health retrieved${NC}"
else
    echo -e "${RED}✗ Failed to get device health${NC}"
    exit 1
fi
echo ""

# Get contact stats
echo "11. Getting Contact Statistics..."
response=$(curl -s "$BASE_URL/api/contacts/stats" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Statistics retrieved${NC}"
else
    echo -e "${RED}✗ Failed to get statistics${NC}"
    exit 1
fi
echo ""

# Bulk import test
echo "12. Testing Bulk Import..."
response=$(curl -s -X POST "$BASE_URL/api/bulk/import" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d '{
        "contacts": [
            {"first_name": "Alice", "last_name": "Brown", "phone_primary": "+1111111111"},
            {"first_name": "Bob", "last_name": "Wilson", "phone_primary": "+2222222222"}
        ]
    }')

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Bulk import successful${NC}"
else
    echo -e "${RED}✗ Bulk import failed${NC}"
    exit 1
fi
echo ""

# Delete contact
echo "13. Deleting Contact..."
response=$(curl -s -X DELETE "$BASE_URL/api/contacts/$CONTACT_ID" \
    -H "X-API-Key: $API_KEY")

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Contact deleted successfully${NC}"
else
    echo -e "${RED}✗ Failed to delete contact${NC}"
    exit 1
fi
echo ""

# Final summary
echo "================================================"
echo -e "${GREEN}All API tests passed! ✓${NC}"
echo "================================================"
echo ""
echo "Your API Key for further testing:"
echo "$API_KEY"
echo ""
echo "You can now:"
echo "  1. Access web dashboard: $BASE_URL"
echo "  2. View API docs: $BASE_URL/docs"
echo "  3. Use the API key above for Android integration"
echo ""
echo "To test WebSocket:"
echo "  - Connect to: $BASE_URL"
echo "  - Authenticate with: {api_key: '$API_KEY', agent_code: 'TEST_AGENT', device_id: 'test_device'}"
echo ""

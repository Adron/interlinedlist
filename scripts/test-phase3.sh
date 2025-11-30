#!/bin/bash

# Test script for Phase 3 functionality
# This script tests post creation, feed, and interactions

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing Phase 3: Core Post Feed System"
echo "========================================"
echo ""

# Step 1: Register a test user (with unique username)
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser$TIMESTAMP"
TEST_EMAIL="test$TIMESTAMP@example.com"

echo "1. Registering test user ($TEST_USERNAME)..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Test123!@#\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "User registered successfully"; then
  echo -e "${GREEN}✓ User registered${NC}"
  # Extract verification token if in dev mode
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"verificationToken":"[^"]*"' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

# Step 2: Verify email (if token available)
if [ -n "$TOKEN" ]; then
  echo ""
  echo "2. Verifying email..."
  VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$TOKEN\"}")
  
  if echo "$VERIFY_RESPONSE" | grep -q "Email verified successfully"; then
    echo -e "${GREEN}✓ Email verified${NC}"
    ACCESS_TOKEN=$(echo "$VERIFY_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  else
    echo -e "${YELLOW}⚠ Email verification skipped (may need manual verification)${NC}"
  fi
fi

# Step 3: Login if we don't have a token
if [ -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "2. Logging in..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"emailOrUsername\": \"$TEST_USERNAME\",
      \"password\": \"Test123!@#\"
    }")
  
  if echo "$LOGIN_RESPONSE" | grep -q "Login successful"; then
    echo -e "${GREEN}✓ Login successful${NC}"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  else
    echo -e "${RED}✗ Login failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
  fi
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ Could not get access token${NC}"
  exit 1
fi

echo ""
echo "3. Creating a test post..."
POST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "content": "Hello world! This is my first post on InterlinedList. #testing #hello"
  }')

if echo "$POST_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Post created${NC}"
  POST_ID=$(echo "$POST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Post ID: $POST_ID"
else
  echo -e "${RED}✗ Post creation failed${NC}"
  echo "$POST_RESPONSE"
  exit 1
fi

# Step 4: Get feed
echo ""
echo "4. Getting feed..."
FEED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/posts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$FEED_RESPONSE" | grep -q "posts"; then
  echo -e "${GREEN}✓ Feed retrieved${NC}"
  POST_COUNT=$(echo "$FEED_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
  echo "  Posts in feed: $POST_COUNT"
else
  echo -e "${RED}✗ Feed retrieval failed${NC}"
  echo "$FEED_RESPONSE"
fi

# Step 5: Like post
echo ""
echo "5. Liking post..."
LIKE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/posts/$POST_ID/like" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$LIKE_RESPONSE" | grep -q "Post liked"; then
  echo -e "${GREEN}✓ Post liked${NC}"
else
  echo -e "${RED}✗ Like failed${NC}"
  echo "$LIKE_RESPONSE"
fi

# Step 6: Bookmark post
echo ""
echo "6. Bookmarking post..."
BOOKMARK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/posts/$POST_ID/bookmark" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$BOOKMARK_RESPONSE" | grep -q "Post bookmarked"; then
  echo -e "${GREEN}✓ Post bookmarked${NC}"
else
  echo -e "${RED}✗ Bookmark failed${NC}"
  echo "$BOOKMARK_RESPONSE"
fi

# Step 7: Get single post
echo ""
echo "7. Getting single post..."
SINGLE_POST=$(curl -s -X GET "$BASE_URL/api/posts/$POST_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$SINGLE_POST" | grep -q "id"; then
  echo -e "${GREEN}✓ Single post retrieved${NC}"
  LIKE_COUNT=$(echo "$SINGLE_POST" | grep -o '"likes":[0-9]*' | grep -o '[0-9]*')
  echo "  Like count: $LIKE_COUNT"
else
  echo -e "${RED}✗ Single post retrieval failed${NC}"
  echo "$SINGLE_POST"
fi

# Step 8: Create reply
echo ""
echo "8. Creating reply..."
REPLY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"content\": \"This is a reply to the first post!\",
    \"replyToId\": \"$POST_ID\"
  }")

if echo "$REPLY_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Reply created${NC}"
  REPLY_ID=$(echo "$REPLY_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗ Reply creation failed${NC}"
  echo "$REPLY_RESPONSE"
fi

# Step 9: Get replies
if [ -n "$REPLY_ID" ]; then
  echo ""
  echo "9. Getting replies..."
  REPLIES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/posts/$POST_ID/replies" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$REPLIES_RESPONSE" | grep -q "replies"; then
    echo -e "${GREEN}✓ Replies retrieved${NC}"
    REPLY_COUNT=$(echo "$REPLIES_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "  Reply count: $REPLY_COUNT"
  else
    echo -e "${RED}✗ Replies retrieval failed${NC}"
    echo "$REPLIES_RESPONSE"
  fi
fi

# Step 10: Unlike post
echo ""
echo "10. Unliking post..."
UNLIKE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/posts/$POST_ID/like" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$UNLIKE_RESPONSE" | grep -q "Post unliked"; then
  echo -e "${GREEN}✓ Post unliked${NC}"
else
  echo -e "${RED}✗ Unlike failed${NC}"
  echo "$UNLIKE_RESPONSE"
fi

# Step 11: Unbookmark post
echo ""
echo "11. Unbookmarking post..."
UNBOOKMARK_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/posts/$POST_ID/bookmark" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$UNBOOKMARK_RESPONSE" | grep -q "Post unbookmarked"; then
  echo -e "${GREEN}✓ Post unbookmarked${NC}"
else
  echo -e "${RED}✗ Unbookmark failed${NC}"
  echo "$UNBOOKMARK_RESPONSE"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Phase 3 testing complete!${NC}"
echo ""
echo "Note: To test repost functionality, create another user and repost the test post."


# Testing Guide - AI-Attendance System

This guide explains how to test the AI-Attendance system **without a physical CCTV camera**.

---

## 🎯 Testing Methods

### Method 1: Webcam Testing (Recommended for Local Development)

#### Setup:
```bash
# 1. Ensure your computer's webcam is connected
# 2. Start the system
docker-compose up -d

# 3. In the AI service configuration, set CCTV_SOURCE to your webcam
CCTV_SOURCE=0  # 0 for default webcam, or 1, 2 for other cameras
```

#### How to Test:
1. Run the AI service with webcam source
2. Look at the camera for 3-5 seconds
3. Check API logs for detection
4. Verify attendance record created in database

```bash
# View AI service logs
docker-compose logs -f ai-service

# Check API logs
docker-compose logs -f api
```

---

### Method 2: Video File Testing (Mock CCTV Stream)

#### Setup Videos:
```bash
# Create test videos directory
mkdir -p test_videos

# Download or create a sample video with faces
# Example: Use a short video clip with multiple people
# Store in: test_videos/sample.mp4
```

#### Configuration:
```env
# In docker-compose.yml or .env
CCTV_SOURCE=test_videos/sample.mp4
MOCK_CCTV=true
```

#### Run Test:
```bash
# Start the system
docker-compose up -d

# View logs
docker-compose logs -f ai-service

# Expected output:
# - Face detections logged
# - Attendance records created
# - Photos stored in S3
```

---

### Method 3: API Mock Data Testing (No Computer Vision)

**Best for:** Testing backend functionality without AI

#### 1. Start the System:
```bash
docker-compose up -d
```

#### 2. Create Test User:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Test@1234",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "userType": "student"
  }'
```

#### 3. Login & Get Token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Test@1234"
  }'

# Copy the token from response
```

#### 4. Post Mock Attendance (IN):
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:5000/api/attendance/mark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "IN",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "photoUrl": "https://example.com/photo.jpg",
    "confidence": 0.95
  }'
```

#### 5. Post Mock Attendance (OUT):
```bash
curl -X POST http://localhost:5000/api/attendance/mark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "OUT",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "photoUrl": "https://example.com/photo.jpg",
    "confidence": 0.95
  }'
```

#### 6. Verify Attendance:
```bash
curl -X GET http://localhost:5000/api/attendance/today \
  -H "Authorization: Bearer $TOKEN"
```

---

### Method 4: Automated Test Suite

#### Run Unit Tests:
```bash
# API Tests
cd backend/api
npm test

# AI Service Tests
cd ../ai-service
pytest tests/ -v
```

#### Run Integration Tests:
```bash
# Full system test with test database
npm run test:integration
```

#### Run End-to-End Tests:
```bash
# Cypress tests for Web Portal
cd frontend/web-portal
npm run cypress:open
```

---

## 🧪 Test Scenarios

### Scenario 1: Student Attendance Marking

#### Steps:
1. Create a student user
2. Create parent user and link to student
3. Simulate face detection (use webcam or mock)
4. Verify attendance marked as "Present"
5. Verify parent received notification

#### Verification:
```bash
# Check attendance record
curl http://localhost:5000/api/attendance/today

# Check notification logs
curl http://localhost:5000/api/notifications/logs

# Check parent received notification
# (In real Firebase, this would show in mobile app)
```

---

### Scenario 2: Employee Check-In/Check-Out

#### Steps:
1. Create employee user
2. Create manager user
3. Simulate employee entering (IN)
4. Wait 5 minutes
5. Simulate employee leaving (OUT)
6. Verify manager received notification

#### Verification:
```bash
# Check attendance with time duration
curl http://localhost:5000/api/attendance/report?date=2026-05-28

# Expected: IN time 09:30, OUT time 14:35
```

---

### Scenario 3: Late Arrival

#### Steps:
1. Set organization attendance rules (in=9:00 AM)
2. Simulate attendance at 9:30 AM
3. Verify marked as "Late"
4. Verify notification indicates late

---

### Scenario 4: Multiple Entries (Same Day)

#### Steps:
1. Simulate IN at 9:00 AM (First detection marks IN)
2. Simulate OUT at 1:00 PM (Last detection marks OUT)
3. Simulate IN at 2:00 PM (New entry, marks new IN)
4. Simulate OUT at 5:30 PM (Final OUT time)
5. Verify 2 entries recorded

---

## 📱 Mobile App Testing

### Without Physical Device:

#### 1. Using Android Emulator:
```bash
# Start Android emulator
emulator -avd Pixel_4_API_30

# Build and run app
cd frontend/mobile-app
npx react-native run-android
```

#### 2. Using iOS Simulator:
```bash
# Build and run app
cd frontend/mobile-app
npx react-native run-ios
```

#### 3. Using Expo (Easiest):
```bash
# Install Expo CLI
npm install -g expo-cli

# Start Metro bundler
cd frontend/mobile-app
expo start

# Scan QR code with Expo app on your phone
# Or use web preview
```

### Testing Mobile Features:
1. **Push Notifications**: Use Firebase emulator
2. **Offline Sync**: Disconnect internet, make changes, reconnect
3. **Biometric Auth**: Test with emulator fingerprint simulation
4. **Photo Gallery**: View stored attendance photos

---

## 🌐 Web Portal Testing

### Using Browser DevTools:

```bash
# Start web portal
docker-compose up -d web-portal

# Open browser
# http://localhost:3000

# Test features:
# - Login/Logout
# - View attendance dashboard
# - View reports
# - View real-time updates
```

### Testing Real-time Updates:

```bash
# Open web portal in 2 browser tabs
# Tab 1: Admin dashboard
# Tab 2: Post attendance via API

# In Tab 2 terminal:
curl -X POST http://localhost:5000/api/attendance/mark \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "type": "IN"}'

# Tab 1 should update in real-time (WebSocket)
```

---

## 🗄️ Database Testing

### Connect to PostgreSQL:
```bash
# Using psql
psql -h localhost -U postgres -d ai_attendance

# Or use DBeaver/DataGrip for GUI
```

### View Tables:
```sql
-- Check attendance records
SELECT * FROM attendance ORDER BY created_at DESC LIMIT 10;

-- Check users
SELECT id, email, role FROM users;

-- Check notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check photos
SELECT * FROM photos ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 API Testing Tools

### Using Postman:
1. Import `backend/api/postman_collection.json`
2. Set environment variables
3. Run test collections

### Using cURL Script:
```bash
# Run test script
bash scripts/test-api.sh

# Output: Pass/Fail for each endpoint
```

### Using Thunder Client (VS Code):
1. Install Thunder Client extension
2. Open Thunder Client
3. Import test requests from `docs/thunder-client.json`

---

## 🔍 Debugging

### View Docker Logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f ai-service
docker-compose logs -f postgres
```

### Enable Debug Mode:
```env
# In .env
LOG_LEVEL=debug
NODE_DEBUG=*
```

### Database Debugging:
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d ai_attendance

# Enable verbose output
SET log_statement = 'all';
```

---

## ✅ Test Checklist

- [ ] API Server starts without errors
- [ ] Database migrations run successfully
- [ ] Web portal loads and connects to API
- [ ] Mock attendance data can be posted via API
- [ ] Attendance records appear in database
- [ ] Attendance appears in web portal
- [ ] Mobile app connects to API (via emulator)
- [ ] WebSocket real-time updates work
- [ ] File upload to S3 works
- [ ] Firebase notifications log created
- [ ] User notifications endpoint responds
- [ ] Reports generate successfully
- [ ] Authentication/authorization works
- [ ] Rate limiting prevents abuse

---

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot connect to database"
```bash
# Solution:
# Check if postgres container is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection string in .env
```

### Issue 2: "AI service not detecting faces"
```bash
# Solution:
# Check if AI service container is running
docker-compose logs -f ai-service

# Verify CCTV_SOURCE setting
# Test with different source (0, 1, or video file)
```

### Issue 3: "S3 upload fails"
```bash
# Solution:
# Verify AWS credentials in .env
# Check S3 bucket exists and permissions are correct
# Test with AWS CLI: aws s3 ls
```

### Issue 4: "Firebase notifications not working"
```bash
# Solution:
# Verify Firebase credentials in .env
# Check Firebase project exists
# Verify device tokens are registered
```

---

## 📈 Performance Testing

### Load Test with Mock Data:
```bash
# Install Apache Bench
apt-get install apache2-utils

# Run load test
ab -n 1000 -c 10 http://localhost:5000/api/attendance/today
```

### Monitor Resource Usage:
```bash
# Watch Docker stats
docker stats

# Expected:
# - API: < 500MB
# - AI Service: 2-4GB (due to ML models)
# - Database: < 200MB
```

---

## 📝 Logging Test Results

Create `test-results.md`:
```markdown
# Test Results - 2026-05-28

## Unit Tests
- API Tests: ✅ PASSED (45/45)
- AI Tests: ✅ PASSED (32/32)

## Integration Tests
- Database: ✅ PASSED
- S3: ✅ PASSED
- Firebase: ✅ PASSED

## Manual Tests
- API Endpoints: ✅ PASSED
- Web Portal: ✅ PASSED
- Mobile App: ✅ PASSED

## Performance
- API Response Time: 120ms avg
- Database Query: 50ms avg
- Face Detection: 1.8s per frame
```

---

**Happy Testing! 🚀**

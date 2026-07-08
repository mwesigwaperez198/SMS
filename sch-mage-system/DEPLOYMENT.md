# NovaAdmin API - Deployment Guide

## Quick Start (Local Testing)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run Development Server
```bash
python main.py
```

Server runs on `http://localhost:8000`

### 4. Test API
- API Docs: `http://localhost:8000/docs` (Swagger UI)
- OpenAPI Spec: `http://localhost:8000/openapi.json`
- Health Check: `http://localhost:8000/api/v1/health`

### 5. Test Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_or_email": "9876543210",
    "password": "password123"
  }'
```

**Test Credentials:**
- Phone: `9876543210` OR Email: `jeetendra@doon.edu.in`
- Password: `password123`

---

## Deployment to Infinity Free

### Option A: Using Gunicorn (Recommended)

#### 1. Setup Server
```bash
# SSH into your server
ssh infinityfree_user@your-domain.infinityfreeapp.com

# Navigate to public_html or app directory
cd ~/public_html
# or
cd ~/novaadmin
```

#### 2. Install Python & Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

#### 3. Create Gunicorn Config (`gunicorn_config.py`)
```python
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
access_log = "-"
error_log = "-"
```

#### 4. Start Server
```bash
gunicorn main:app --config gunicorn_config.py
```

Or use systemd (create `/etc/systemd/system/novaadmin.service`):
```ini
[Unit]
Description=NovaAdmin API
After=network.target

[Service]
User=your_username
WorkingDirectory=/home/your_username/novaadmin
Environment="PATH=/home/your_username/novaadmin/venv/bin"
ExecStart=/home/your_username/novaadmin/venv/bin/gunicorn main:app --workers 4 --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl enable novaadmin
sudo systemctl start novaadmin
```

---

### Option B: Docker Deployment (Cloud-Ready)

Use the checked-in `Dockerfile` and `docker-compose.prod.yml` for production-style deployments. Keep `.env` outside the image; `.dockerignore` excludes it from the build context.

#### 1. Configure Environment
```bash
cp .env.example .env
# Edit .env:
# ENVIRONMENT=production
# SECRET_KEY=<strong random value, 32+ chars>
# DB_USER=<database user>
# DB_PASSWORD=<database password>
# CORS_ORIGINS=https://your-frontend-domain.example
```

#### 2. Build & Run
```bash
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
```

---

### Option C: Heroku Deployment

#### 1. Create `Procfile`
```
web: gunicorn main:app --worker-class uvicorn.workers.UvicornWorker --workers 4
```

#### 2. Deploy
```bash
heroku create novaadmin-api
heroku config:set SECRET_KEY="your-secret-key"
git push heroku main
heroku logs --tail
```

---

## API Endpoints Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Student/Parent login |
| `/api/v1/student/me` | GET | Get current user profile |
| `/api/v1/attendance` | GET | Get student attendance |
| `/api/v1/homework` | GET | Get homework list |
| `/api/v1/fees/invoices` | GET | Get fee invoices |
| `/api/v1/fees/dashboard` | GET | Fee collection summary |
| `/api/v1/payments/initiate` | POST | Start payment gateway |
| `/api/v1/results` | GET | Get exam results |
| `/api/v1/library/loans` | GET | Get library loans |
| `/api/v1/messages/inbox` | GET | Get messages |
| `/api/v1/timetable` | GET | Get class timetable |
| `/api/v1/leave/apply` | POST | Apply for leave |
| `/api/v1/transport/route` | GET | Get bus route |
| `/api/v1/health` | GET | Health check |

---

## Mobile App Integration

### 1. Configure Base URL in Mobile App
```typescript
// React Native / Flutter / Native Android
const API_BASE_URL = "https://api.kesug.infinityfreeapp.com";
```

### 2. Login Flow
```typescript
const login = async (phone_or_email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_or_email, password })
  });
  
  const data = await response.json();
  // Store token in SecureStorage
  await SecureStorage.setItem("auth_token", data.token);
  return data.user;
};
```

### 3. All Future Requests
```typescript
const headers = {
  "Authorization": `Bearer ${await SecureStorage.getItem("auth_token")}`,
  "Content-Type": "application/json"
};
```

---

## Production Checklist

- [x] App refuses missing/weak production `SECRET_KEY`
- [x] Production Docker image excludes `.env`
- [x] Production Docker healthcheck uses standard-library HTTP client
- [ ] Set `SECRET_KEY` to a strong random value in production
- [ ] Setup MariaDB database (production)
- [ ] Setup Redis cache
- [ ] Configure environment variables (.env)
- [ ] Setup SSL certificate (HTTPS)
- [x] App refuses wildcard production CORS
- [ ] Set production `CORS_ORIGINS` to approved frontend domains
- [ ] Setup monitoring (Sentry, DataDog, etc.)
- [ ] Setup logging (ELK Stack or Cloudwatch)
- [ ] Configure rate limiting
- [ ] Setup automated backups
- [ ] Test all payment gateway integrations
- [ ] Setup Firebase Cloud Messaging (push notifications)
- [ ] Test SMS gateway (if needed)
- [ ] Load testing (with Apache JMeter)
- [ ] Security audit (SQLi, XSS, CSRF)

---

## Troubleshooting

### Port 8000 Already in Use
```bash
# Find & kill process
lsof -i :8000
kill -9 <PID>
```

### JWT Token Expired
Mobile app should refresh token:
```python
# Backend: Implement token refresh endpoint
@app.post("/api/v1/auth/refresh")
def refresh_token(current_user = Depends(verify_token)):
    new_token = create_access_token(current_user["user_id"], current_user["school_id"])
    return {"token": new_token}
```

### CORS Errors
Add origin to `.env`:
```
CORS_ORIGINS=http://localhost:3000,https://app.novaadmin.com,https://mobile.novaadmin.com
```

---

## Files to Upload to Infinity Free

### Essential Files:
1. `main.py` - Main FastAPI application
2. `requirements.txt` - Python dependencies
3. `.env` - Environment variables (create from .env.example)
4. `.htaccess` - Apache configuration (if needed)
5. `openapi.yaml` - API specification

### Optional but Recommended:
1. `docker-compose.prod.yml` - Production Docker setup (if using Docker)
2. `Dockerfile` - Docker container definition
3. `gunicorn_config.py` - Gunicorn configuration
4. `Procfile` - For Heroku deployment
5. `.gitignore` - Git ignore rules

### Documentation:
1. `DEPLOYMENT.md` - This file
2. `README.md` - Project overview
3. `API_ENDPOINTS.md` - API documentation

---

## Next Steps

1. **Backend Enhancement:**
   - Extend real MariaDB database models and migrations
   - Implement rate limiting
   - Add request validation & error handling
   - Setup proper logging

2. **Security:**
   - Implement OAuth2 with Google/Microsoft
   - Add 2FA (OTP via SMS)
   - Setup SSL/TLS certificates
   - Implement OWASP security headers

3. **Mobile Development:**
   - React Native app (Android & iOS)
   - Flutter app (cross-platform)
   - Native Android app (Kotlin)
   - Native iOS app (Swift)

4. **Admin Dashboard:**
   - React.js web app
   - Student/teacher/fee management
   - Real-time dashboards
   - Bulk import/export

5. **Infrastructure:**
   - Setup CDN for static files
   - Configure email service
   - Payment gateway integration
   - Push notification system

---

**Questions?** Contact: api@novaadmin.com

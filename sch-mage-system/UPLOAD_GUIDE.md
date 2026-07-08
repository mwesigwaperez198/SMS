# Files to Upload to Infinity Free (kesug domain)

## Summary
You have created a complete FastAPI backend for NovaAdmin with OpenAPI spec, mock data, and deployment-ready code. This document tells you EXACTLY which files to upload and how to deploy.

---

## ✅ Files Created (10 Total)

### Backend Core Files (REQUIRED)
1. **main.py** - FastAPI application with all 18+ endpoints
2. **requirements.txt** - Python dependencies (FastAPI, Pydantic, JWT, etc.)
3. **openapi.yaml** - Complete OpenAPI 3.0 specification
4. **.env** - Environment variables (create from .env.example, customize)

### Configuration Files (REQUIRED)
5. **Dockerfile** - Docker container definition
6. **docker-compose.yml** - Local development stack (PostgreSQL, Redis, Adminer)

### Documentation (RECOMMENDED)
7. **DEPLOYMENT.md** - Detailed deployment instructions
8. **ICON_SETUP.md** - Branding & icon setup for all platforms
9. **README.md** - Project overview & quick start
10. **.env.example** - Template for environment variables

---

## 🚀 Quick Deployment to Infinity Free

### Step 1: Upload Files via FTP/cPanel

**Files to upload to `~/public_html/` or `~/novaadmin/`:**
```
public_html/
├── main.py                    ✅ UPLOAD
├── requirements.txt           ✅ UPLOAD
├── openapi.yaml              ✅ UPLOAD
├── .env                       ✅ UPLOAD (after customizing)
├── Dockerfile                ✅ UPLOAD (for reference)
├── docker-compose.yml        ℹ️ Upload (optional, for Docker)
├── DEPLOYMENT.md             ℹ️ Upload (for reference)
├── README.md                 ℹ️ Upload (for reference)
└── .gitignore               ✅ Create with: *.pyc, __pycache__, .env, venv/
```

### Step 2: SSH into Your Server
```bash
ssh infinity_free_username@your-domain.infinityfreeapp.com
```

### Step 3: Setup Python Environment
```bash
cd ~/public_html   # or ~/novaadmin

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn
```

### Step 4: Configure Environment (.env)
```bash
nano .env
```

Minimal configuration:
```
SECRET_KEY=change-this-to-a-strong-random-string-at-least-32-chars
DEBUG=False
DATABASE_URL=sqlite:///./novaadmin.db
REDIS_URL=redis://localhost:6379/0
HOST=0.0.0.0
PORT=8000
```

### Step 5: Start the Server

**Option A: Simple (Development)**
```bash
python main.py
# Server runs on port 8000
# Access: http://your-domain.infinityfreeapp.com:8000
```

**Option B: Production (Recommended)**
```bash
gunicorn main:app --workers 4 --bind 0.0.0.0:8000 --timeout 120
```

**Option C: Use nohup for Background Running**
```bash
nohup python main.py > server.log 2>&1 &
# or
nohup gunicorn main:app --workers 4 --bind 0.0.0.0:8000 > server.log 2>&1 &
```

### Step 6: Verify It's Running
```bash
# Check status
curl http://localhost:8000/api/v1/health

# View logs
tail -f server.log
```

### Step 7: Setup Domain
In Infinity Free cPanel:
1. Go to **Addon Domains** or **Parked Domains**
2. Add your domain (kesug.infinityfreeapp.com or custom domain)
3. Point to `~/public_html` or `~/novaadmin`

---

## 📱 Mobile App Configuration

Once deployed, configure your mobile app to use:

```typescript
// React Native example
const API_BASE_URL = "https://kesug.infinityfreeapp.com/api/v1";

// Login
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    phone_or_email: "9876543210",
    password: "password123"
  })
});

const { token, user } = await response.json();
// Store token and use for future requests
```

---

## 🔐 Security Notes

### Before Going Public:
1. **Change SECRET_KEY** to a strong random string
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Set DEBUG=False** in .env

3. **Configure CORS** properly:
   ```python
   # In main.py, update CORS origins
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "https://kesug.infinityfreeapp.com",
           "https://app.novaadmin.com",
           "https://mobile.novaadmin.com"
       ],
   )
   ```

4. **Enable HTTPS** - Infinity Free provides free SSL

5. **Rate Limiting** - Add to main.py:
   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address
   
   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   ```

---

## 🧪 Testing After Deployment

### Test 1: Health Check
```bash
curl https://kesug.infinityfreeapp.com/api/v1/health
# Expected: {"status":"ok","version":"1.0.0"}
```

### Test 2: Login
```bash
curl -X POST "https://kesug.infinityfreeapp.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_or_email": "9876543210",
    "password": "password123"
  }'
```

### Test 3: Protected Endpoint
```bash
# Get token from login above
curl -H "Authorization: Bearer <TOKEN>" \
  https://kesug.infinityfreeapp.com/api/v1/student/me
```

### Test 4: API Documentation
- Swagger UI: `https://kesug.infinityfreeapp.com/docs`
- ReDoc: `https://kesug.infinityfreeapp.com/redoc`

---

## 📊 Database Setup (Optional but Recommended)

For production with real data, setup PostgreSQL:

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb novaadmin_db
sudo -u postgres createuser novaadmin_user
sudo -u postgres psql -c "ALTER USER novaadmin_user WITH PASSWORD 'strong_password';"

# Update .env
DATABASE_URL=postgresql://novaadmin_user:strong_password@localhost:5432/novaadmin_db

# Run migrations (create tables)
python -c "from main import app; print('Database configured')"
```

---

## 🔄 Continuous Deployment (Optional)

### Auto-restart on Reboot
Create `/etc/systemd/system/novaadmin.service`:
```ini
[Unit]
Description=NovaAdmin API
After=network.target

[Service]
User=infinity_user
WorkingDirectory=/home/infinity_user/public_html
Environment="PATH=/home/infinity_user/public_html/venv/bin"
ExecStart=/home/infinity_user/public_html/venv/bin/gunicorn main:app --workers 4 --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable novaadmin
sudo systemctl start novaadmin
```

---

## 📁 Icon Files to Upload (Separate)

Once you generate icons using ICON_SETUP.md, upload to web app:

```
public/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── mstile-150x150.png
├── og-image.png
└── manifest.json
```

---

## 💾 Backup Strategy

### Daily Backup (via cron)
```bash
# Create backup script: backup.sh
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Backup database
pg_dump novaadmin_db > "$BACKUP_DIR/db_$DATE.sql"

# Backup code
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" ~/public_html

# Upload to cloud storage (optional)
aws s3 cp "$BACKUP_DIR/" s3://novaadmin-backups/ --recursive
```

Schedule via crontab:
```bash
crontab -e
0 2 * * * /home/user/backup.sh  # 2 AM daily
```

---

## 🆘 Troubleshooting

### Problem: Port 8000 Already in Use
```bash
lsof -i :8000
kill -9 <PID>
```

### Problem: Module Not Found Error
```bash
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

### Problem: Database Connection Error
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Test connection
psql -U user -d database_name -c "SELECT 1"
```

### Problem: CORS Errors from Mobile App
Update CORS in main.py to include your mobile app domain:
```python
allow_origins=[
    "https://kesug.infinityfreeapp.com",
    "capacitor://localhost",
    "ionic://localhost"
]
```

### Problem: Slow Response Times
- Check: `tail -f server.log`
- Monitor: `top`, `free -h`
- Optimize: Reduce Gunicorn workers if low memory
- Cache: Add Redis caching for frequently accessed data

---

## 📞 Support & Next Steps

### 1. Verify Deployment Works
- [ ] Health check returns `{"status":"ok"}`
- [ ] Login endpoint works with test credentials
- [ ] Protected endpoints require valid JWT token
- [ ] API docs available at `/docs`

### 2. Connect Mobile App
- [ ] Update base URL in React Native / Flutter code
- [ ] Test login flow
- [ ] Test all 18 main endpoints
- [ ] Monitor performance & logs

### 3. Setup Web Dashboard (Next Phase)
- Create React/Vue app
- Connect to same API backend
- Deploy to Vercel/Netlify (free tier)

### 4. Production Hardening
- [ ] Enable 2FA/OTP
- [ ] Setup monitoring & alerts
- [ ] Configure automated backups
- [ ] Load test with JMeter
- [ ] Security audit

---

## 📋 Deployment Checklist

- [ ] All files uploaded to ~/public_html
- [ ] Python venv created & activated
- [ ] requirements.txt installed
- [ ] .env configured with SECRET_KEY
- [ ] Server running (python main.py or gunicorn)
- [ ] Health check passes
- [ ] Login endpoint works
- [ ] Mobile app can connect
- [ ] Database backup strategy in place
- [ ] HTTPS enabled
- [ ] CORS configured for your domains

---

## Summary

**What You Have:**
1. ✅ Complete OpenAPI specification (18+ endpoints)
2. ✅ Production-ready FastAPI code with JWT auth
3. ✅ Multi-tenant middleware for school isolation
4. ✅ Mock data for testing all features
5. ✅ Docker setup for local development
6. ✅ Comprehensive deployment guides
7. ✅ Icon setup for web, mobile, desktop

**What You Need to Do:**
1. Upload 4 core files (main.py, requirements.txt, openapi.yaml, .env)
2. Create Python venv and install dependencies
3. Configure SECRET_KEY and database
4. Start server with `python main.py` or gunicorn
5. Update mobile app to point to your domain
6. Test all endpoints

**Time to Deploy:** ~15 minutes on Infinity Free

---

**Questions?** See DEPLOYMENT.md for detailed troubleshooting.

**Ready to Deploy?** Start with Step 1 above. Good luck! 🚀

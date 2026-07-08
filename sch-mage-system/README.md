# NovaAdmin - School Management System

**A scalable, multi-tenant platform for schools to manage students, teachers, fees, attendance, exams, and more.**

---

## Overview

NovaAdmin is built to serve millions of students across multiple schools. The system includes:
- **Web Admin Dashboard** - For school administrators
- **Mobile App** - For students and parents (iOS, Android)
- **REST API** - Microservices-ready backend

Current implementation status: this repo contains the FastAPI API scaffold with mock student data. Before real production use, replace the mock user/data layer with database-backed authentication, tenant-aware models, migrations, and audited admin workflows.

### Key Features

| Module | Features |
|--------|----------|
| **Students** | Profiles, class assignment, documents, photo gallery |
| **Teachers** | Profile, subjects taught, class assignment, schedule |
| **Attendance** | Daily marking, monthly reports, patterns |
| **Academics** | Classes, subjects, timetable, homework, exams |
| **Fees** | Invoice generation, payment tracking, receipts |
| **Exam** | Grades, report cards, transcripts, results |
| **Library** | Book lending, fines, search, catalog |
| **Transport** | Routes, buses, live tracking, driver info |
| **Communication** | Messages, remarks, circulars, announcements |
| **Events** | Calendar, holidays, special events, celebrations |

---

## Technology Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MariaDB via SQLAlchemy/PyMySQL
- **Cache:** Redis
- **Queue:** Kafka / RabbitMQ (for async jobs)
- **Storage:** AWS S3 / MinIO

### Frontend (Web)
- **Framework:** React.js / Vue.js
- **Build:** Vite / Webpack
- **State:** TanStack Query / Redux
- **Styling:** Tailwind CSS / Material UI

### Mobile Apps
- **Android/iOS:** planned shared web client wrapped with Capacitor
- **Desktop:** planned shared web client wrapped with Electron or Tauri

### DevOps
- **Containerization:** Docker
- **Orchestration:** Kubernetes (optional)
- **CI/CD:** GitHub Actions / GitLab CI
- **Hosting:** AWS / GCP / Infinity Free

---

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/novaadmin.git
cd novaadmin
```

### 2. Install Dependencies
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

### 3. Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run Development Server
```bash
python main.py
```

Visit `http://localhost:8000/docs` to view API documentation.

### 5. Docker (Recommended)
```bash
docker compose up --build
```

For a production-style container stack, set strong values in an env file and run:
```bash
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
```

---

## API Documentation

### Base URL
```
Development: http://localhost:8000
Production: https://api.kesug.infinityfreeapp.com
```

### OpenAPI Spec
- Swagger UI: `GET /docs`
- ReDoc: `GET /redoc`
- OpenAPI JSON: `GET /openapi.json`

### Authentication
All endpoints (except `/auth/login` and `/health`) require JWT token.

```bash
# Get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone_or_email": "9876543210", "password": "password123"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer <your_token>" \
  http://localhost:8000/api/v1/student/me
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Login |
| `/api/v1/student/me` | GET | Current user profile |
| `/api/v1/attendance` | GET | Attendance records |
| `/api/v1/fees/invoices` | GET | Fee invoices |
| `/api/v1/payments/initiate` | POST | Start payment |
| `/api/v1/results` | GET | Exam results |
| `/api/v1/library/loans` | GET | Library loans |
| `/api/v1/messages/inbox` | GET | Messages |
| `/api/v1/timetable` | GET | Class schedule |
| `/api/v1/transport/route` | GET | Transport route |

See `openapi.yaml` for complete specification.

---

## Project Structure

```
novaadmin/
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker container
├── docker-compose.yml         # Local dev stack
├── openapi.yaml              # OpenAPI specification
├── DEPLOYMENT.md             # Deployment guide
├── ICON_SETUP.md             # Branding & icons
├── README.md                 # This file
├── .env.example              # Environment template
└── .gitignore

web/                          # React/Vue frontend (separate repo)
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── index.html
├── src/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── App.jsx
└── package.json

mobile/                       # React Native / Flutter (separate repo)
├── android/
├── ios/
├── src/
├── app.json
└── package.json

desktop/                      # Electron / Tauri (separate repo)
├── src/
├── assets/
└── package.json
```

---

## Authentication

Authentication is now database-backed. Users are stored in MariaDB with PBKDF2 password hashes and JWT bearer tokens.

Supported roles:

`super_admin`, `school_admin`, `principal`, `teacher`, `student`, `parent`, `accountant`, `librarian`, `transport_manager`, `receptionist`

### Login Flow
```
1. User submits phone/email + password
2. Server validates credentials
3. Returns JWT token + user profile
4. Mobile/Web stores token in SecureStorage
5. All future requests include: Authorization: Bearer <token>
```

### Test Credentials
| Field | Value |
|-------|-------|
| Phone | 9876543210 |
| Email | jeetendra@doon.edu.in |
| Password | password123 |
| Role | student |
| School | Doon International School Delhi |
| Class | X-A |

Demo users are seeded only when `SEED_DEMO_DATA=True`. In production, create the first admin using `INITIAL_ADMIN_*` env values and `python scripts/init_db.py`.

---

## Development

### Code Style
- Python: PEP 8 (use `black` formatter)
- JavaScript: Prettier + ESLint
- Git: Conventional commits

### Testing
```bash
# Run tests
python -m pytest

# Coverage
pytest --cov=. tests/

# Load testing
locust -f tests/load_test.py
```

### Database Migration
```bash
# Create migration
alembic revision --autogenerate -m "Add users table"

# Run migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Git Workflow
```bash
git checkout -b feature/module-name
# Make changes
git commit -m "feat: add module feature"
git push origin feature/module-name
# Create pull request
```

---

## Deployment

### Infinity Free (Recommended for MVP)
```bash
# See DEPLOYMENT.md for detailed instructions
# Quick: Upload files to ~/public_html
# Run: python main.py or gunicorn main:app --workers 4
```

### Docker (Production)
```bash
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
kubectl get pods
kubectl logs deployment/novaadmin-api
```

---

## Configuration

All settings via environment variables (see `.env.example`):

```bash
# JWT
ENVIRONMENT=production
SECRET_KEY=replace-with-a-strong-random-secret-at-least-32-characters
ACCESS_TOKEN_EXPIRE_DAYS=30

# Database
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/novaadmin_db?charset=utf8mb4
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=novaadmin
DB_PASSWORD=change-me
DB_NAME=novaadmin_db

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=https://app.novaadmin.com
CORS_ALLOW_CREDENTIALS=True

# Payments
STRIPE_API_KEY=sk_test_xxx
RAZORPAY_KEY_ID=rzp_test_xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_BUCKET_NAME=novaadmin-uploads

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_USER=noreply@novaadmin.com
SMTP_PASSWORD=xxx
```

---

## Performance & Scaling

### Optimization Techniques
1. **Database**
   - Partitioning: attendance, payments by date
   - Indexing: student search, fee lookup
   - Read replicas: for dashboards, reports

2. **Caching**
   - Redis: student profiles, class lists, timetable
   - HTTP caching: 1hr for calendar, circulars
   - Browser cache: static assets

3. **Async Processing**
   - Kafka/RabbitMQ for SMS, emails, PDF generation
   - Background workers for fee reminders
   - Async reporting (no blocking user requests)

4. **Load Balancing**
   - Stateless app servers (scale horizontally)
   - API Gateway: Kong, AWS ALB
   - CDN: Cloudflare for static files + API

### Expected Performance
- **Throughput:** 10,000 requests/sec per region
- **Latency:** 50-100ms (p95)
- **Users:** 1,000+ concurrent per app server
- **Students supported:** 1M+ (distributed across regions)

---

## Security

### Best Practices Implemented
- ✅ JWT authentication with expiration
- ✅ HTTPS only (TLS 1.3)
- ✅ CORS configured per environment
- ✅ SQL injection prevention (ORM)
- ✅ XSS prevention (parameterized outputs)
- ✅ Rate limiting (100 req/min per user)
- ✅ Input validation (Pydantic models)
- ✅ Audit logging (all API calls)

### Additional Security
- [ ] Enable 2FA (OTP via SMS)
- [ ] Implement OAuth2 (Google, Microsoft login)
- [ ] SSL certificate pinning (mobile apps)
- [ ] Encryption at rest (sensitive fields)
- [ ] Regular security audits
- [ ] Penetration testing

---

## Monitoring & Logging

### Metrics
- API response time (p50, p95, p99)
- Error rate by endpoint
- Database query performance
- Cache hit/miss ratio
- Queue depth (async jobs)

### Tools
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack / Cloudwatch
- **Error Tracking:** Sentry
- **Performance:** New Relic / DataDog

### Alerts
- API down (uptime < 99.9%)
- Error rate spike (>5%)
- DB query slow (>1sec)
- Queue lag (>1min)
- Memory usage (>80%)

---

## Contributing

### Steps to Contribute
1. Fork repository
2. Create feature branch: `git checkout -b feature/name`
3. Make changes & commit: `git commit -am 'feat: description'`
4. Push: `git push origin feature/name`
5. Create pull request with description

### Code Review Checklist
- [ ] Tests written
- [ ] Code formatted (black, prettier)
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] CHANGELOG updated

---

## Troubleshooting

### Server Won't Start
```bash
# Check port 8000 in use
lsof -i :8000
kill -9 <PID>

# Check dependencies
pip install -r requirements.txt

# Check env vars
cat .env
```

### Database Connection Error
```bash
# Verify MariaDB running
mysql -u novaadmin -p novaadmin_db

# Reset database
DROP DATABASE novaadmin_db;
CREATE DATABASE novaadmin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Mobile App Can't Connect
```bash
# Verify API URL
https://api.kesug.infinityfreeapp.com/api/v1/health

# Check CORS
curl -H "Origin: http://app.local" \
  http://localhost:8000/api/v1/health
```

---

## FAQ

**Q: Can I use SQLite instead of MariaDB?**
A: Only for tests or local prototypes. Production should use MariaDB for this deployment.

**Q: How to backup student data?**
A: Use `mysqldump` for MariaDB or automated snapshots in cloud.

**Q: Can I add more modules?**
A: Yes! Each module is independent. Follow the Homework module example.

**Q: How to generate PDF reports?**
A: Use WeasyPrint/LaTeX in background workers. Don't block API.

**Q: How to send SMS notifications?**
A: Integrate Twilio/AWS SNS. Recommend Kafka queue for reliability.

---

## Support & Resources

- 📧 Email: support@novaadmin.com
- 💬 Discord: [Join Community](#)
- 📚 Documentation: [Wiki](#)
- 🐛 Issues: [GitHub Issues](#)
- 💡 Feature Requests: [GitHub Discussions](#)

---

## License

MIT License - See LICENSE file

---

## Roadmap

### Phase 1 (MVP - Q4 2025)
- [x] API with 18 core endpoints
- [x] JWT authentication
- [x] Mobile app (iOS/Android)
- [ ] Web admin dashboard
- [ ] Payment integration

### Phase 2 (Q1 2026)
- [ ] Real-time notifications
- [ ] Video classes
- [ ] AI homework grading
- [ ] Parent portal enhancements

### Phase 3 (Q2 2026)
- [ ] Biometric attendance
- [ ] AR campus tours
- [ ] Advanced analytics
- [ ] Multi-language support

---

**Built with ❤️ by Novara Team**

*Last updated: 2025-09-25*

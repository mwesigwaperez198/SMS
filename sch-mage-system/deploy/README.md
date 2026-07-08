# NovaAdmin Production Upload Guide

Domains:

- `novaadmin.kesug.com` for admin and staff
- `novastudent.kesug.com` for students and parents

## Upload These Files

Upload the backend project root to:

```bash
/var/www/novaadmin
```

Required files and folders:

```text
main.py
settings.py
database.py
db_models.py
security_utils.py
seed_data.py
requirements.txt
openapi.yaml
openapi.json
deploy/
scripts/
.env
```

Do not upload local caches such as `__pycache__/`, `.pytest_cache/`, `.venv/`, or `.env.example`.

## Server Setup

For free/shared hosting, upload the matching htdocs zip instead of the Python backend. The htdocs zips include a PHP `api/` folder that can run on PHP hosting with MariaDB. Copy `.env.example` to `.env`, set DB credentials, set `SECRET_KEY` and `INSTALL_TOKEN`, then open:

```text
https://novaadmin.kesug.com/api/v1/install?token=YOUR_INSTALL_TOKEN
```

After installation, this must return JSON:

```text
https://novaadmin.kesug.com/api/v1/ready
```

Use the Python/FastAPI setup below only on a VPS or server that can run Python services.

```bash
cd /var/www/novaadmin
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Create the MariaDB database and user using your real credentials:

```sql
CREATE DATABASE novaadmin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'novaadmin'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON novaadmin_db.* TO 'novaadmin'@'localhost';
FLUSH PRIVILEGES;
```

Copy `deploy/.env.production.example` to `.env`, then set the real secrets.

Make sure both web domains are allowed:

```env
CORS_ORIGINS=https://novaadmin.kesug.com,https://novastudent.kesug.com
```

Initialize schema and the first admin:

```bash
ENVIRONMENT=production DB_AUTO_CREATE=True python scripts/init_db.py
```

Then keep `DB_AUTO_CREATE=False` in `.env` for normal runtime.

## Gunicorn Service

```bash
sudo cp deploy/novaadmin.service /etc/systemd/system/novaadmin.service
sudo systemctl daemon-reload
sudo systemctl enable novaadmin
sudo systemctl start novaadmin
sudo systemctl status novaadmin
```

## Nginx

Upload the admin/staff web files to:

```bash
/var/www/novaadmin-web
```

Upload the student/parent web files to:

```bash
/var/www/novastudent-web
```

```bash
sudo cp deploy/nginx-novaadmin.conf /etc/nginx/sites-available/novaadmin
sudo cp deploy/nginx-novastudent.conf /etc/nginx/sites-available/novastudent
sudo ln -s /etc/nginx/sites-available/novaadmin /etc/nginx/sites-enabled/novaadmin
sudo ln -s /etc/nginx/sites-available/novastudent /etc/nginx/sites-enabled/novastudent
sudo nginx -t
sudo systemctl reload nginx
```

Add HTTPS with Certbot:

```bash
sudo certbot --nginx -d novaadmin.kesug.com -d novastudent.kesug.com
```

## Smoke Tests

```bash
curl https://novaadmin.kesug.com/api/v1/health
curl https://novaadmin.kesug.com/api/v1/ready
```

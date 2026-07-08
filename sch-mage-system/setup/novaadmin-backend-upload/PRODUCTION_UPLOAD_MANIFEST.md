# Production Upload Manifest

Upload these files to `/var/www/novaadmin` on the server for `novaadmin.kesug.com`:

- `main.py`
- `settings.py`
- `database.py`
- `db_models.py`
- `security_utils.py`
- `seed_data.py`
- `requirements.txt`
- `openapi.json`
- `openapi.yaml`
- `.env` created from `deploy/.env.production.example`
- `scripts/init_db.py`
- `deploy/gunicorn_conf.py`
- `deploy/novaadmin.service`
- `deploy/nginx-novaadmin.conf`
- `deploy/nginx-novastudent.conf`
- `deploy/README.md`

Do not upload:

- `.venv/`
- `__pycache__/`
- `.pytest_cache/`
- local `.env` files from other projects
- test caches or logs

## Web Client Uploads

Do not upload all of these packages into the same domain. Choose the package that matches the hosting setup.

Admin/staff portal:

- Domain: `novaadmin.kesug.com`
- Folder: `setup/novaadmin-htdocs/`
- Zip: `release/novaadmin-htdocs-upload.zip`
- Includes the free-hosting PHP `api/` folder.

Student/parent portal:

- Domain: `novastudent.kesug.com`
- Folder: `setup/novastudent-htdocs/`
- Zip: `release/novastudent-htdocs-upload.zip`
- Includes the free-hosting PHP `api/` folder.

One free-hosting account with both domains:

- Upload zip: `release/novaadmin-novastudent-one-account-htdocs.zip`
- Upload target: the main `htdocs` or `public_html` folder
- Admin root: `https://novaadmin.kesug.com`
- Student root: `https://novastudent.kesug.com`
- The zip includes a `novastudent/` folder and `.htaccess` rules that route the student subdomain there.
- The zip includes a root `api/` folder for PHP/MariaDB free hosting.
- Copy `.env.example` to `.env`, set hosting MariaDB credentials, then open `/api/v1/install?token=YOUR_INSTALL_TOKEN` once.

Both portals connect to the same backend API and MariaDB school management database.

Production `.env` must allow both web origins:

- `CORS_ORIGINS=https://novaadmin.kesug.com,https://novastudent.kesug.com`

After uploading a new API build, rerun the installer once to apply new tables safely:

- `https://novaadmin.kesug.com/api/v1/install?token=YOUR_INSTALL_TOKEN`

This installer is idempotent: it keeps existing users/data and creates missing production tables.

## Desktop Staff App

Install on the headteacher/admin/accounts/reception computer:

- Installer: `release/NovaAdmin Desktop Setup 1.0.0.exe`
- Portable app: `release/NovaAdmin Desktop 1.0.0.exe`

The desktop app opens the live school system at:

- `https://novaadmin.kesug.com`

It uses the same server database as the web portal and student/parent apps.

Prepared backend bundle:

- `release/novaadmin-backend-upload.zip`

The same source is synced to:

- `clients/web/android/` for Android APK builds
- `clients/web/ios/` for iOS builds
- `clients/web/electron/` for desktop builds

## Android Build Output

Prepared signed Android APKs:

- `release/novaadmin-android-release.apk`
- `release/novastudent-android-release.apk`

Private signing files:

- `release/novaadmin-upload-key.jks`
- `release/android-signing-private.txt`

Keep the signing files private. Future Android updates must be signed with the same key.

## Desktop And iOS Notes

Desktop source is in `clients/web/electron/` and packages with `npm run desktop:build`. On this Windows machine, Electron runtime download from GitHub stalled before the installer could be produced.

iOS source is in `clients/web/ios/`. Building the final iOS `.ipa` requires macOS with Xcode and an Apple signing account.

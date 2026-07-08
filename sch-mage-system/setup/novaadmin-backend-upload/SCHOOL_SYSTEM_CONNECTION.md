# School Management System Connection

NovaAdmin is now arranged as a connected web/mobile/desktop client plus a school-side API.

## Production Domain

Admin/staff users open:

```text
https://novaadmin.kesug.com
```

Students and parents open:

```text
https://novastudent.kesug.com
```

Both web apps are served from their domain roots. API calls go to the same backend:

```text
https://novaadmin.kesug.com/api/v1/...
```

## School Computer Role

Install the backend on the school computer or school server where MariaDB is available. That backend is the source of truth for:

- student profile
- attendance
- homework
- circulars
- fees
- messages
- transport
- role dashboards

The client reads the data through the API. For a school LAN deployment, set:

```text
VITE_API_BASE_URL=http://<school-computer-ip>:8000
```

For public access, keep:

```text
VITE_API_BASE_URL=https://novaadmin.kesug.com
```

For the hosted htdocs packages, edit `config.js` instead of rebuilding:

```js
window.NovaAdminConfig = {
  apiBaseUrl: "https://novaadmin.kesug.com",
};
```

The backend `.env` must allow both web domains:

```text
CORS_ORIGINS=https://novaadmin.kesug.com,https://novastudent.kesug.com
```

## Web Upload

Build:

```bash
cd clients/web
npm run build
```

Admin/staff upload folder:

```text
setup/novaadmin-htdocs/
```

Student/parent upload folder:

```text
setup/novastudent-htdocs/
```

## API Upload

Upload backend files listed in `PRODUCTION_UPLOAD_MANIFEST.md` to:

```text
/var/www/novaadmin
```

The Nginx config in `deploy/nginx-novaadmin.conf` serves the admin web app and proxies `/api/` to the backend. The `deploy/nginx-novastudent.conf` config serves the student/parent web app.

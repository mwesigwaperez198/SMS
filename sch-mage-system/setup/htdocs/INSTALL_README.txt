NovaAdmin htdocs upload package

Upload everything inside this htdocs folder into your hosting account's htdocs/public_html folder.

Important files:
- index.html: starts the web app.
- config.js: set the API/backend URL here.
- .htaccess: Apache rewrite rules for page refresh and direct links.
- assets/, icons/, manifest.webmanifest: required app files.

Current API setting:
config.js points to https://novaadmin.kesug.com

If your backend/API is hosted somewhere else, edit config.js after upload:

window.NovaAdminConfig = {
  apiBaseUrl: "https://your-api-domain.com",
};

If you are testing on the same school computer where FastAPI is running, use:

window.NovaAdminConfig = {
  apiBaseUrl: "http://127.0.0.1:8000",
};

Note:
Most free htdocs hosting supports static files and PHP, but not FastAPI/Python background services.
This htdocs package is the web app frontend. The NovaAdmin backend must run on a Python-capable server, VPS, school computer tunnel, or another API host.

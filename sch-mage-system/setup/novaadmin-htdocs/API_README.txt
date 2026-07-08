NovaAdmin free-hosting API

This package is for shared/free hosting that serves PHP from htdocs/public_html.

Required setup:
1. Copy .env.example to .env in the same folder as index.html.
2. Put your hosting MariaDB credentials in .env.
3. Set SECRET_KEY and INSTALL_TOKEN to private random values.
4. Upload the api/ folder.
5. Open https://novaadmin.kesug.com/api/v1/install?token=YOUR_INSTALL_TOKEN once.
6. Open https://novaadmin.kesug.com/api/v1/ready and confirm JSON:
   {"status":"ready","version":"1.0.0"}

Do not leave placeholder passwords in production.

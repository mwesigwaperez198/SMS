NovaAdmin + NovaStudent one-account hosting upload

Upload everything inside this folder to the main htdocs/public_html folder.

Expected layout after upload:
- htdocs/index.html serves https://novaadmin.kesug.com
- htdocs/config.js is the NovaAdmin config
- htdocs/novastudent/index.html serves https://novastudent.kesug.com
- htdocs/novastudent/config.js is the NovaStudent config

Important checks:
- The student domain spelling should be novastudent.kesug.com.
- If your host lets you choose a document root for the subdomain, point novastudent.kesug.com to the same main htdocs folder when using this one-account package.
- If you upload only the student package, point novastudent.kesug.com directly to the student package folder instead.
- Make sure hidden files upload too, especially .htaccess.
- The root api/ folder serves API requests for both domains.
- Copy .env.example to .env and add the hosting MariaDB credentials.
- Admin API URL: https://novaadmin.kesug.com
- Student API URL: https://novastudent.kesug.com

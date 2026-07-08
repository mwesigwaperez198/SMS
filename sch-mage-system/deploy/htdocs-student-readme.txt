NovaStudent student/parent htdocs upload package

Domain:
https://novastudent.kesug.com

Upload everything inside this folder into the domain htdocs/public_html folder.

This portal allows:
- student
- parent

It is connected to the same school management database through the PHP API on:
https://novastudent.kesug.com

Important:
If you are using the included free-hosting PHP API, copy .env.example to .env and add your hosting MariaDB credentials.

For production:
CORS_ORIGINS=https://novaadmin.kesug.com,https://novastudent.kesug.com

If the school computer backend is exposed through another public URL, edit config.js and set apiBaseUrl to that URL.

NovaAdmin admin/staff htdocs upload package

Domain:
https://novaadmin.kesug.com

Upload everything inside this folder into the domain htdocs/public_html folder.

This portal allows:
- super_admin
- school_admin
- principal
- teacher
- dos
- accountant
- librarian
- transport_manager
- receptionist

Students and parents should use:
https://novastudent.kesug.com

Backend/API:
config.js points to https://novaadmin.kesug.com

For free hosting, use the included PHP api/ folder and copy .env.example to .env with your hosting MariaDB credentials.
For a VPS/server, make sure the FastAPI backend is running and MariaDB is initialized.

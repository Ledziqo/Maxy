# Maxrez Print Commerce

## Local development

```bash
npm install
npm run dev
```

The current build is the first full visual/product foundation. It includes the storefront, service catalog, order-request modal, urgent-delivery option, and role-switchable Admin/Worker operations workspace. Payment verification, accounts, database persistence, file storage, and notifications still need backend credentials and deployment configuration.

## Backend setup

1. Create a MySQL database in Hostinger hPanel.
2. Import `server/schema.sql` in phpMyAdmin.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to the MySQL connection URI and a long random `SESSION_SECRET`.
4. Create the first admin user by inserting a bcrypt password hash into `users` (never store a plain password).
5. Run `npm run build` and start the Node app with `npm run server`.

The API supports admin/worker login, customer orders, artwork uploads, payment-proof uploads, payment-method management, worker assignment, and production-status events. The `private-uploads` directory must not be exposed as a public static folder.

## Build for Hostinger

1. Run `npm run build` locally.
2. In Hostinger hPanel, open **Websites → Add website** and choose a Node.js-capable plan, or use a VPS for full backend control.
3. Upload the project or connect its Git repository.
4. Set the application entry point and start command according to the Node.js app screen. For a static-only preview, upload the contents of `dist/` into `public_html`.
5. Add environment variables for the database, admin secret, mail provider, file storage, and payment integrations before enabling real orders.
6. Point the domain DNS to Hostinger, enable SSL, and test customer checkout, uploads, staff login, and mobile layouts.

Do not put Telebirr, bank, email, or admin secrets into source files. They belong in Hostinger environment variables or a server-side secret store.

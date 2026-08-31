# Maxrez Print Commerce

## Local development

```bash
npm install
npm run dev
```

The current build includes the storefront, service catalog, pricing configurator, order requests, artwork screening, private tracking links, payment-proof review, delivery estimates, and an Admin/Worker operations workspace. Real production use still requires secure environment variables, a persistent upload strategy, database backups, and notification-provider configuration.

## Backend setup

1. Create a MySQL database in Hostinger hPanel.
2. Import `server/schema.sql` in phpMyAdmin.
3. Copy `.env.example` to `.env` and set `DATABASE_URL`, a long random `SESSION_SECRET`, `SETUP_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Visit `/setup` once and enter the value of `SETUP_KEY`. Setup creates the administrator using the environment credentials, then refuses to run again after the first user exists.
5. Run `npm run build` and start the Node app with `npm run server`.

The API supports admin/worker login, customer orders, artwork uploads, payment-proof uploads, payment-method management, worker assignment, simplified order statuses, and payment verification events. The `private-uploads` directory must not be exposed as a public static folder. Payment QR images belong in the separate `public-payment-qr` directory.

## Build for Hostinger

1. Run `npm run build` locally.
2. In Hostinger hPanel, open **Websites → Add website** and choose a Node.js-capable plan, or use a VPS for full backend control.
3. Upload the project or connect its Git repository.
4. Set the application entry point and start command according to the Node.js app screen. For a static-only preview, upload the contents of `dist/` into `public_html`.
5. Add environment variables for the database, admin secret, mail provider, file storage, and payment integrations before enabling real orders.
6. Point the domain DNS to Hostinger, enable SSL, and test customer checkout, uploads, staff login, and mobile layouts.

Do not put Telebirr, bank, email, or admin secrets into source files. They belong in Hostinger environment variables or a server-side secret store.

# Mahesh Marketing Store

A complete starter store for paper products, diaries, and corporate gifting. It includes a responsive customer storefront, cart and checkout, order capture, and a password-protected admin panel.

## Run it on your computer

1. Install the current **LTS version of Node.js** from [nodejs.org](https://nodejs.org/).
2. Open PowerShell in this folder and run `npm install`.
3. Copy `.env.example` to a new file named `.env`.
4. In `.env`, set a long private `ADMIN_TOKEN` and your WhatsApp number in international format (for example `919876543210`).
5. Run `npm start`, then open `http://localhost:3000` in your browser.

Use `npm run dev` while developing; it restarts the server when you save server files.

## Admin panel

Open `http://localhost:3000/admin.html`. Enter the same value you set for `ADMIN_TOKEN`. You can add, edit and remove products, and update the status of each order.

## Important notes before going live

- Orders and products are stored locally in `data/store.json`. Back this file up regularly.
- This is intentionally a simple local store backend. For a public production website, deploy it to a Node.js hosting service, use HTTPS, replace the shared admin token with real user accounts, and connect a payment gateway such as Razorpay.
- Product images use placeholder web photos. Replace image URLs in the admin panel with your own product photos.

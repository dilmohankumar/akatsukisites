# Claim #1 — TopSpot (MERN)

A real, working MERN implementation of the "Claim #1" pay-to-rank leaderboard
that was designed as an HTML/CSS/JS artifact. **This project implements
exactly what that artifact does — nothing more, nothing less.**

> Scope note: an earlier draft brief described a much larger "premium website
> discovery platform" (categories, reviews, admin dashboard, user accounts,
> submission approval, analytics). None of that exists in the actual artifact
> this project is based on, so it has **not** been built here. What follows
> is a faithful, production-grade backend for the real feature set: a public
> leaderboard, a "claim #1 by paying double" flow, and a support-ticket form.

## 1. What the app does

- Shows the current #1 business on a "throne" card (name, logo, URL,
  description, amount).
- Shows a Top 10 board, decreasing in visual size by rank.
- Anyone can **Claim #1**: fill in a small form (name, URL, optional logo,
  description), see the required amount (always **double** whatever the
  current #1 paid, or the base entry amount if the board is empty), pay, and
  instantly become #1.
- A support-ticket form that creates a real ticket in the database and
  returns a reference code.
- A "support the developer" panel (static UPI/QR display — no backend
  needed for that).

## 2. Architecture

```
topspot-mern/
├── backend/         Express + MongoDB REST API
└── frontend/        React (Vite) SPA, same visual design as the artifact
```

The frontend never computes prices itself — every amount shown is fetched
from the backend, and the backend is the only place that decides what a
successful "claim" actually costs. The client cannot post an arbitrary
amount and expect it to be honoured.

## 3. Technology stack

**Backend:** Node.js, Express, MongoDB, Mongoose, Helmet, CORS,
express-rate-limit, Morgan.

**Frontend:** React 18, Vite, Axios. Plain CSS (ported verbatim from the
original artifact) — no CSS framework was introduced, to keep the visual
design unchanged.

## 4. Folder structure

```
backend/
  src/
    config/db.js
    models/            Business.js, SupportTicket.js
    controllers/       businessController.js, supportController.js
    routes/            businessRoutes.js, supportRoutes.js
    middleware/        errorHandler.js
    utils/             asyncHandler.js, apiResponse.js, validators.js
    app.js
    server.js
  seed/seed.js
  .env.example

frontend/
  src/
    api/               client.js, board.js, support.js
    components/        Stars, Header, Throne, Top10List, ClaimForm,
                        PayStep, SuccessView, SupportModal, Footer
    hooks/useBoard.js
    styles/index.css   (the original artifact's CSS, unmodified)
    utils/format.js
    App.jsx, main.jsx
  .env.example
```

## 5. Requirements

- Node.js 18+
- npm 9+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)

## 6. Installation

```bash
git clone <this-repo>
cd topspot-mern
npm run install:all
```

This installs dependencies for the root, `backend/`, and `frontend/`.

## 7. Environment variables

Copy the example files and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

| Variable            | Description                                             |
|---------------------|----------------------------------------------------------|
| `MONGO_URI`         | MongoDB connection string                                |
| `PORT`              | Port the API listens on (default `5000`)                 |
| `CLIENT_URL`        | Comma-separated allowed CORS origins                      |
| `BASE_ENTRY_AMOUNT` | ₹ amount for the very first business if the board is empty |

**frontend/.env**

| Variable        | Description                          |
|-----------------|----------------------------------------|
| `VITE_API_URL`  | Base URL of the backend API, e.g. `http://localhost:5000/api` |

## 8. MongoDB setup

Local:

```bash
mongod --dbpath ./data
```

Or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and
paste its connection string into `MONGO_URI`.

## 9. Seed the database

```bash
npm run seed
```

Inserts the same 10 realistic Indian businesses used in the original
artifact's demo (Sundar Chai House at #1 with ₹10,000, down to Metro Fitness
Studio at #10 with ₹1,000).

## 10. Run the backend

```bash
cd backend
npm run dev      # nodemon, auto-restarts on change
# or
npm start        # plain node
```

## 11. Run the frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`.

## 12. Run both at once (recommended)

From the project root:

```bash
npm run dev
```

## 13. Production build

```bash
npm run build          # builds the frontend into frontend/dist
npm run start:backend  # runs the API with plain node
```

Serve `frontend/dist` with any static host (Nginx, Vercel, Netlify, etc.)
and point `VITE_API_URL` at your deployed API's public URL before building.

## 14. API overview

All responses follow:

```json
{ "success": true, "data": {}, "message": "..." }
```

or, on error:

```json
{ "success": false, "message": "...", "errors": [] }
```

| Method | Endpoint              | Description                                      |
|--------|------------------------|---------------------------------------------------|
| GET    | `/api/health`          | Health check                                       |
| GET    | `/api/board`           | Top 10 businesses, highest amount first            |
| GET    | `/api/board/next-price`| Current #1's amount and the price to overtake it   |
| GET    | `/api/board/:id`       | A single business by id                            |
| POST   | `/api/board/claim`     | Claim #1 (rate-limited: 20 / 10 min per IP)        |
| POST   | `/api/support`         | Raise a support ticket (rate-limited: 10 / 10 min) |

### POST /api/board/claim

```json
{
  "name": "Meera's Bakery",
  "url": "meerasbakery.in",
  "description": "Fresh-baked breads and cakes, delivered daily.",
  "logo": "data:image/png;base64,... (optional)"
}
```

The server computes `amount` itself (double the current #1, or
`BASE_ENTRY_AMOUNT` if the board is empty) — any `amount` sent by the client
is ignored.

### POST /api/support

```json
{
  "name": "Kumar Electricals",
  "email": "kumar@example.com",
  "topic": "Payment deducted but rank didn't update",
  "details": "Optional longer description."
}
```

Returns `{ "refCode": "VRT-48213" }`.

## 15. Authentication

**There is none, by design.** The original artifact has no login, signup,
or dashboard screens — claiming #1 is an open action, exactly like the
artifact demonstrates. If you want to restrict who can claim #1 in a real
deployment, the natural next step is to add a `User` model and JWT auth in
front of `POST /api/board/claim` — the codebase is structured (controllers /
routes / middleware separated) so that a `protect` middleware could be
dropped into `businessRoutes.js` without touching business logic.

## 16. Admin access

Not implemented, for the same reason: the artifact has no admin screens.

## 17. Deployment instructions

1. Provision a MongoDB Atlas cluster (or any managed MongoDB).
2. Deploy `backend/` to any Node host (Render, Railway, Fly.io, a VPS).
   Set `MONGO_URI`, `CLIENT_URL` (your deployed frontend's origin), and
   `BASE_ENTRY_AMOUNT` there.
3. Deploy `frontend/` (after `npm run build`) to any static host, with
   `VITE_API_URL` pointed at the deployed backend's `/api` URL.
4. Run `npm run seed` once against the production database if you want the
   demo businesses pre-populated (optional — the board works empty too).

## 18. Troubleshooting

- **"MONGO_URI is not set"** — copy `backend/.env.example` to `backend/.env`.
- **CORS errors in the browser console** — make sure `CLIENT_URL` in
  `backend/.env` exactly matches the origin the frontend is served from.
- **"Too many claim attempts"** — the claim and support endpoints are
  rate-limited per IP; wait 10 minutes or adjust the limiter in
  `backend/src/routes/*.js` for local testing.
- **Board looks empty** — run `npm run seed`, or just use the app: the very
  first "Claim #1" submission becomes the board's #1 automatically.

## 19. Assumptions and limitations (read before relying on this in prod)

- **No real payment gateway is wired in.** The "Pay" step collects card/UPI
  fields for visual fidelity with the artifact, but submitting it calls
  `POST /api/board/claim` directly — there is no Razorpay/Stripe charge.
  Wiring a real gateway is a follow-up task; the amount-calculation logic
  (the part that actually matters for the ranking model) is fully real and
  server-authoritative.
- **No authentication/authorization**, because the artifact has none. See
  §15.
- **Logos are stored as base64 strings** on the `Business` document (capped
  at ~2MB) rather than uploaded to object storage (S3/Cloudinary). Fine for
  a demo/small deployment; swap in a real upload service for scale.
- **The board is never pruned** — every claim is kept in the database, and
  `GET /api/board` simply reads the top 10 by amount. This is simpler and
  safer than deleting historical entries, at the cost of unbounded growth
  in a very high-traffic deployment (add a cleanup job if that becomes an
  issue).

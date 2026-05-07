# Kitoo

V1 lead capture app for expo and conference teams. The repository contains:

- `mobile/`: an Expo React Native client for capturing, tagging, filtering, following up with, and exporting leads.
- `server/`: an Express API backed by PostgreSQL that now also serves the responsive Kitoo web dashboard at `/`.

## Core flows

- Capture a lead manually, from a visiting card photo upload, or by scanning a QR code.
- Tag leads as `hot`, `warm`, or `cold`.
- Launch a WhatsApp follow-up with a prefilled event message.
- View all leads with tag and date filters.
- Search leads and page through results in the web dashboard.
- Export filtered data as CSV.

## Project structure

```text
.
|-- mobile
|   |-- App.js
|   |-- app.json
|   |-- src
|-- server
|   |-- sql/init.sql
|   |-- src
```

## Setup

### 1. Install dependencies

```bash
npm install
```

If your package manager does not install workspace dependencies automatically, run:

```bash
npm install --workspace server
npm install --workspace mobile
```

### 2. Start PostgreSQL

Create a database, for example `expo_lead_hub`, then run:

```bash
psql -d expo_lead_hub -f server/sql/init.sql
```

### 3. Configure the API

Copy `server/.env.example` to `server/.env` and update the values.

### 4. Start the backend and web app

```bash
npm run start:server
```

The Kitoo web app will run on `http://localhost:4000` and the API will be available under `http://localhost:4000/api`.

### 5. Start the mobile app

```bash
npm run start:mobile
```

By default the app points to `http://10.0.2.2:4000/api`, which works for an Android emulator. For a physical device, update the API URL inside the app to your machine's LAN IP, for example `http://192.168.1.25:4000/api`.

## API overview

- `GET /health`
- `GET /`
- `GET /api`
- `GET /api/leads?temperature=hot&date=2026-04-03`
- `GET /api/leads/stats`
- `POST /api/leads`
- `PUT /api/leads/:id`
- `POST /api/leads/:id/contacted`
- `GET /api/leads/export/csv`
- `POST /api/uploads/card`

## Notes

- V1 stores the uploaded visiting-card image and keeps manual field review in the app. OCR can be layered in later without changing the lead model.
- WhatsApp follow-up uses click-to-chat for the first version, so it works without an approved business messaging integration.

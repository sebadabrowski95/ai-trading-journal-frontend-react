**# AI Trading Journal Frontend

Frontend application for the AI Trading Journal platform, built with Next.js, React, TypeScript, and Tailwind CSS.

The app includes:
- authentication flows: login, register, account activation, forgot password, reset password
- a trading journal view for browsing, importing, creating, editing, and deleting transactions
- a dashboard view with cumulative P/L charts, symbol filtering, and win-rate pie charts
- an AI assistant page

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Requirements

- Node.js 20+ recommended
- Backend API: <a href="https://github.com/sebadabrowski95/ai-trading-journal">AI Trading Journal</a>

## Environment Variables


```env
API_SERVER_BASE_URL=http://localhost:8080
```

Notes:
- `API_SERVER_BASE_URL` is used by the Next.js proxy route to forward requests to the backend server.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.


## Main Features

### Trading Journal

- monthly calendar overview
- day details modal
- manual transaction create/edit/delete
- Excel transaction import

<img width="1160" height="1140" alt="Image" src="https://github.com/user-attachments/assets/121090ae-1900-4bd1-996a-5e90df37319d" />

### Dashboard

- fetches chart data from `POST /api/dashboard/charts`
- filters transactions by date range
- filters charts by selected symbols
- renders a cumulative profit/loss line chart based on transaction close times
- renders BUY, SELL, and OVERALL win-rate pie charts based on the currently selected symbols
  <img width="1160" height="664" alt="Image" src="https://github.com/user-attachments/assets/062c0dd0-8e8f-4374-844b-3e271ba4d718" />

### AI Agent

-fetches AI responses from POST /api/ai/chat

<img width="1160" height="906" alt="Image" src="https://github.com/user-attachments/assets/dbadfcb5-9be2-4830-b838-bd2841f82140" />


## Authentication

Authentication state is stored in `localStorage`.

Relevant keys:
- `accessToken`
- `userEmail`

If the API returns `401`, the app clears the stored token and redirects the user to `/login`.


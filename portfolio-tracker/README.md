# Portfolio Tracker · WomenofAlxse

A personal net worth tracker for Malawian investors. Tracks Fixed Deposits, MSE Listed Shares, Unit Trust, Village Bank savings, and Property. Supports liabilities for a full net worth view.

## Tech Stack
- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (recommended)

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
cp .env.example .env.local
```
Then edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
> Get these from: Supabase Dashboard → your project → **Settings → API**

### 3. Run the app
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Running in GitHub Codespaces

```bash
npm install
cp .env.example .env.local
# edit .env.local with your Supabase credentials
npm run dev
```
Codespaces will prompt you to open the forwarded port — click **Open in Browser**.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```
Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel dashboard.

---

## Features
- 📊 Dashboard with net worth hero, donut chart, sparklines
- 📅 Monthly history table with gain/loss percentages
- ➕ Add new monthly entries (saved to Supabase when connected)
- 🔒 Row-level security — each user only sees their own data
- 🌐 Works offline in local mode (no Supabase required)

## Asset Classes
| Class | Color |
|-------|-------|
| Fixed Deposit | Amber |
| Listed Shares (MSE) | Green |
| Unit Trust | Indigo |
| Village Bank | Pink |
| Property | Blue |

---

## Roadmap
- [ ] Auth (Supabase email login)
- [ ] Multi-user / family sharing
- [ ] CSV import from existing spreadsheet
- [ ] Mobile app (React Native + Expo)
- [ ] Maturity date alerts for fixed deposits

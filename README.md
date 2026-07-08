# Norling Law Reviews

A single platform for annual reviews. Staff complete their reflection (save and return any time), performance data is layered in from CSV uploads or the admin panel, reviews are scheduled automatically off each person's anniversary with email reminders, and the director gets a review screen plus a branded PDF pack for the Remarkable.

## What it does

- **Microsoft sign-in** - staff use their Norling Law accounts. When someone leaves and their account is disabled, their access dies with it.
- **Roles** - Brent and Glenn (set via `ADMIN_EMAILS`) see everything including comp. Everyone else only sees their own reflection.
- **Reflections** - seeded with the six values (rating + reflection + focus area) and the forward-focus questions. Autosaves as they type, submit locks it.
- **Question builder** - admins can add, edit, reorder, and deactivate questions and sections without a developer.
- **Performance data** - CSV upload (Actionstep export / targets sheet / accountant's salary sheet) or type it straight into the Data tab. Staff without billable targets never see billable or revenue anywhere.
- **Scheduling + reminders** - a daily job creates each review cycle 3 weeks before the anniversary and emails the staff member, plus Brent and Glenn with a calendar invite attached. Nudge at 1 week if not submitted, flag to admins at 3 days, notification on submission.
- **Director review screen** - self-assessment beside director rating/notes, agreed actions table, comp section (recommendation, increase, rationale).
- **PDF pack** - branded to the guidelines (Inter, black/gold/stone), with write-in space for anything not yet completed on screen. Add `?comp=0` to the PDF URL for an employee-safe version without salary/comp.

## Setup (roughly 1 hour)

### 1. Database
Create a free Postgres database at [neon.tech](https://neon.tech) (or Supabase). Copy the connection string.

### 2. Microsoft Entra app registration
In the Azure portal (Entra ID > App registrations > New registration):
- Name: `Norling Law Reviews`
- Supported account types: single tenant
- Redirect URI (Web): `https://YOUR-DOMAIN/api/auth/callback/azure-ad`
- Create a client secret under Certificates & secrets
- Note the Application (client) ID, Directory (tenant) ID, and the secret value

### 3. Email
Create a [resend.com](https://resend.com) account, verify the norlinglaw.co.nz domain, create an API key. (Or swap `lib/email.ts` for SMTP via Microsoft 365 if IT prefers.)

### 4. Deploy to Vercel
- Push this folder to a private GitHub repo
- Import it in Vercel
- Add every variable from `.env.example` in Project Settings > Environment Variables
- The included `vercel.json` runs the reminder job daily at 8am NZ time (20:00 UTC)

### 5. Initialise
From your machine with the same `DATABASE_URL`:

```bash
npm install
npx prisma db push   # creates the tables
npx prisma db seed   # loads the six values + forward focus questions
```

### 6. First run
- Brent and Glenn sign in (their emails must be in `ADMIN_EMAILS`)
- Add staff under **Staff** with their anniversary dates and whether they have billable targets
- Load salary/targets/actuals under **Data** (CSV or manual)
- The daily job takes it from there

## CSV format

Headers (case-insensitive, extras ignored):

```
email,name,start_date,salary,billable_target,billable_actual,revenue_target,revenue_actual,period
jess@norlinglaw.co.nz,Jess Marson,2021-06-30,,1195,956,,,Jul 2025 - Jun 2026
```

Rows match on email. Leave a cell blank to leave that value untouched. Include `name` and `start_date` only when creating someone new via CSV.

## Local development

```bash
cp .env.example .env   # fill it in
npm install
npx prisma db push && npx prisma db seed
npm run dev
```

To test the reminder engine manually: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`

## Roadmap / Phase 2

- **Google Sheets sync** for the targets sheet (service account + Sheets API) so the CSV step disappears
- **Clio API** for billable hours and revenue when/if the move from Actionstep happens
- **Xero Payroll** salary sync
- **Review meeting transcript agent** - upload the meeting transcript, an AI pass fills the director notes, drafts agreed actions and emails Brent a summary. Kept out of v1 deliberately.
- Teams notifications alongside email

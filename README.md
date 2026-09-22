# Bookshop Voice Ticket Agent (BVTA)

AI-powered voice ticket system for bookshops. Customers speak, tickets appear for shop staff in real time.

## Status

🚧 Week 1 complete — foundation deployed

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB Atlas (free)
- **AI:** Google Gemini (free tier)
- **Frontend:** React (Week 4)
- **Hosting:** Render (server), Vercel (client)

## Docs

See `docs/` folder:
- SRS
- System Design
- API Specification
- Database Schema
- UI/UX Wireframes
- Development Roadmap

## Local Setup

```bash
cd server
npm install
cp .env.example .env
# edit .env with your MONGODB_URI
npm run dev

Server runs on http://localhost:3000

Health Check
```bash
curl http://localhost:3000/health
```

License
MIT

text

---

## 🎯 Now Do This — In Order

### Step 1: Stop the crashed server

In your terminal, press `Ctrl+C`.

### Step 2: Delete node_modules and reinstall

```bash
cd /workspaces/bookshop-voice-ticket-agent/server
rm -rf node_modules package-lock.json
```
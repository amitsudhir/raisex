# 🚀 Crowdfund DApp - Setup

## ⚡ Quick Start

```bash
# 1. Install
npm install

# 2. Setup .env
cp .env.example .env
# Edit .env and add: DEPLOYER_PRIVATE_KEY=0xYourPrivateKey

# 3. Deploy & Seed (auto-creates 3 demo campaigns)
npm run demo:setup

# 4. Start
npm start
```

**Visit: http://localhost:3000?demo=1**

---

## 🎯 What You Get

- ✅ Contract deployed to Base Sepolia
- ✅ 3 demo campaigns with donations
- ✅ Demo mode UI (clean & professional)
- ✅ Ready for hackathon presentation

---

## 📝 Commands

```bash
npm run demo:setup    # Deploy + seed everything
npm run deploy:base   # Deploy contract only
npm run seed:demo     # Seed campaigns only
npm start             # Start app
```

---

## 🎬 Demo Mode

Add `?demo=1` to URL for clean UI:
- Hides dev panels
- Shows "Demo Mode" banner
- Professional look for judges

---

## 🌐 Deploy Live

```bash
git push origin main
# Then deploy on Vercel
```

---

## 📊 Seeded Campaigns

1. Community Center (80% funded)
2. Medical Equipment (10% funded)
3. Coding Bootcamp (40% funded)

---

**That's it! Everything automated.**

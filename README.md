# 🎅 North Pole Post — your "Letter from Santa" shop

A small website that sells a **personalised letter from Santa**. A visitor types a
child's name + a good deed, pays (₹1 for now), and instantly gets a beautiful
letter on screen and by email.

- **Demo (design preview):** the claude.ai link Claude gave you — looks the same, but uses a *fake* pay button.
- **This folder:** the **real** site. Real Razorpay payment + real email. This is the one that earns money.

---

## Part 1 — Run it on your computer (15 minutes)

### 1. Install Node.js (one time)
Download the **LTS** version from <https://nodejs.org> and install it (just keep clicking Next).
To check it worked, open **PowerShell** and type:
```powershell
node -v
```
You should see a version number like `v20.x`.

### 2. Install the project
In PowerShell, inside this `santa` folder:
```powershell
npm install
```

### 3. Get your Razorpay keys (free)
1. Sign up at <https://dashboard.razorpay.com>.
2. Go to **Settings → API Keys → Generate Key**.
3. You'll get a **Key Id** (starts with `rzp_test_`) and a **Key Secret**. Copy both.
   - *Test keys* let you practise with fake money. *Live keys* (`rzp_live_`) need KYC — see Part 2.

### 4. Create your settings file
Copy `.env.example` and rename the copy to **`.env`**, then open it and paste your keys:
```powershell
Copy-Item .env.example .env
notepad .env
```
Fill in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Leave `PRICE_PAISE=100` (that's ₹1). Save.

### 5. (Optional) Turn on email
To auto-email the letter, use a Gmail account:
1. Turn on **2-Step Verification**: <https://myaccount.google.com/security>
2. Create an **App Password**: <https://myaccount.google.com/apppasswords> (pick "Mail"). You'll get a 16-letter code.
3. In `.env`, set `SMTP_USER` to your Gmail address and `SMTP_PASS` to that 16-letter code.

*(Skip this and the letter still shows on screen — just no email.)*

### 6. Start the website
```powershell
npm start
```
Open **http://localhost:3000** in your browser. Fill the form and pay.

**Testing the payment (test mode):** on the Razorpay popup pick **Card** and use
`4111 1111 1111 1111`, any future expiry, any CVV. No real money moves.

---

## Part 2 — Take REAL money (go live)

1. In your Razorpay dashboard, complete **KYC**: PAN, business/your details, and a **bank account** (where your money lands).
2. Once approved, switch to **Live Mode** and generate **Live keys** (`rzp_live_…`).
3. Put the live keys in `.env` and restart. Now the ₹1 is real money into your bank. 🎉
4. When ready to earn properly, change `PRICE_PAISE` to `9900` (= ₹99) and restart.

> 💡 Razorpay charges a small fee per payment (about 2%). On ₹99 that's ~₹2.

---

## Part 3 — Put it on the internet (so others can visit)

Right now only you can see it (localhost). To give it a public link, deploy free on **Render**:

1. Make a free account at <https://render.com>.
2. Push this folder to a free **GitHub** repo (or use Render's manual deploy).
3. New → **Web Service** → connect the repo.
4. Build command: `npm install`  ·  Start command: `npm start`.
5. Add your `.env` values under **Environment** (never upload the `.env` file itself).
6. Render gives you a link like `https://north-pole-post.onrender.com` — share that!

*(Railway, Fly.io, or a cheap VPS work the same way.)*

---

## Part 4 — 🚦 How to get visitors (free)

A great site earns ₹0 if nobody sees it. In Santa season, parents are your customers. Go where they already are:

**Start here (fastest):**
- **WhatsApp** — send the link to family & friends with kids, and to parent/society groups. Ask 5 people to forward it. This alone can get your first sales.
- **Instagram Reels / YouTube Shorts** — a 15-sec video: "I got my kid a REAL letter from Santa 🎅". Show the letter. Put the link in your bio. Post daily in December.
- **Facebook groups** — search for local "moms", "parenting", "<your city> parents" groups and share (follow each group's rules; be helpful, not spammy).

**Build trust:**
- Post a few **real example letters** (blur private bits) so people see the quality.
- Add **reviews/screenshots** from your first happy customers.

**Make customers bring customers:**
- The site already gives each buyer a **referral code** ("share and get ₹20 off"). Remind them to share it — this is your "get paid when they share" idea working for real.

**Spend money only after free works:**
- Once you have sales, try a tiny **Instagram/Facebook ad** (₹100–300/day) targeting parents, ages 25–45, in India. Watch if ₹1 spent brings more than ₹1 back.

**Timing:** demand peaks **late Nov → 24 Dec**. Start sharing by mid-November.

---

## Files in this project
| File | What it does |
|---|---|
| `server.js` | The backend: creates orders, verifies payments, sends email. |
| `letter.js` | Writes the Santa letter (kept on the server so it can't be faked). |
| `public/index.html` | The website visitors see. |
| `.env` | Your secret keys & price (you create this — never share it). |
| `package.json` | The list of tools the project needs. |

## Common problems
- **"Razorpay keys are not set"** → you didn't create `.env`, or didn't restart after editing it.
- **Payment popup doesn't open** → check your internet (the Razorpay script loads online).
- **No email arrives** → check the Gmail App Password, and look in the Spam folder.
- **Price shows ₹—** → the server isn't running; do `npm start` and refresh.

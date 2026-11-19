# Aurelia Care Hospital: WhatsApp assistant (sample)

A small Node.js server that answers patients on WhatsApp. It uses the **WhatsApp Business Platform (Cloud API)** from Meta.
It reuses the same answer engine (`lib/bot-core.js`) as the website demo at `../whatsapp.html`, so the web chat and the WhatsApp bot always say the same thing.

> Aurelia Care Hospital is an imaginary hospital: every doctor, price and number is a sample.
> The code is tested with simulated messages (`DRY_RUN`), but it has **not** been connected to a live WhatsApp number.

## What it does

- Answers: OPD timings, address and parking, visiting hours, doctors by department or name, doctors available today, health packages, room charges, insurance, records, phone numbers.
- Suggests a department from a symptom ("chest pain" gives Cardiology) with a "not medical advice" note.
- Shows the emergency number first for serious words such as "cannot breathe".
- Sends WhatsApp **quick-reply buttons** (up to 3) under each answer.
- Checks that every message really comes from Meta (`X-Hub-Signature-256`), ignores repeated deliveries, and slows down a number that sends more than 20 messages a minute.

## How it works

```
Patient -> WhatsApp -> Meta -> POST /webhook (this server) -> lib/bot-core.js -> Graph API -> Patient
```

## Try it without WhatsApp (dry run)

Needs Node.js 18 or newer. No `npm install` is needed.

```
cd whatsapp-bot
DRY_RUN=1 node server.js          # Windows PowerShell: $env:DRY_RUN=1; node server.js
```

In another terminal, send a fake WhatsApp message:

```
curl -X POST localhost:3000/webhook -H "Content-Type: application/json" -d '{"entry":[{"changes":[{"value":{"messages":[{"id":"1","from":"919999999999","type":"text","text":{"body":"health packages"}}]}}]}]}'
```

The reply the bot would send is printed in the console.

## Go live (for a real client)

1. **Meta account.** Create a Meta Business account and an app at developers.facebook.com. Add the **WhatsApp** product.
2. **Phone number.** Add the client's WhatsApp Business number (a number that is not already used in the normal WhatsApp app). Meta also gives a free test number while you build.
3. **Copy the settings.** From the app's WhatsApp > API setup page, copy the *Phone number ID* and a *permanent access token* (create a System User token). From App settings > Basic, copy the *App secret*.
4. **Host the server.** Deploy this folder to a Node.js host that has a public https address (Render, Railway or a small VPS).
   Set these environment variables (see `.env.example`): `VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `APP_SECRET`, `SITE_URL`.
   Start command: `node server.js`. Use an always-on plan: free plans sleep, and a sleeping server makes the first patient wait.
5. **Connect the webhook.** In Meta's WhatsApp > Configuration page, set the callback URL to `https://YOUR-SERVER/webhook` and the verify token to your `VERIFY_TOKEN`. Subscribe to the **messages** field.
6. **Test.** Message the number from your own phone. Check the server logs if there is no reply.
7. **Go public.** Meta must verify the business before the number can message real patients at scale. Replies to patients who message first are free for 24 hours; messages the business starts need approved templates and cost a small fee.

Never put the real `.env` file or any token in GitHub.

## Files

| File | Purpose |
| --- | --- |
| `server.js` | Webhook server: verification, signature check, sending replies |
| `lib/bot-core.js` | Answer engine, shared with the website demo |
| `lib/data.js` | Doctors, departments and package prices (same data as the site) |
| `.env.example` | Settings to fill in |
| `package.json` | Start script and Node version |

Keep `lib/bot-core.js` and `lib/data.js` identical to `../js/bot-core.js` and `../js/data.js` when you change them.

## Next steps

- Let the bot call the booking server so a patient can confirm a slot inside WhatsApp.
- Add an AI model for questions the rules do not cover.
- Save conversations in a database for the hospital staff.

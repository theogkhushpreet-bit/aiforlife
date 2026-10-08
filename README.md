# Bharat Jeevan AI — Gemini Privilege Discovery

A Viksit Bharat 2047 student prototype that turns one structured citizen/family profile into personalized actions and government-benefit discovery.

## What is new

- **✨ Check My Privileges** button on the dashboard and AI Copilot.
- `/api/privileges` endpoint.
- Conservative prototype eligibility/rule engine.
- Gemini explanation layer using the official `@google/genai` SDK.
- Offline privilege matching still works when no Gemini key is configured.
- Official myScheme links are shown for scheme verification.
- AI is instructed never to claim official approval or invent eligibility.

## How the privilege flow works

`Citizen Profile → Rule Engine → Potential Matches → Gemini Explanation → Official Verification`

The rule engine performs the actual prototype matching. Gemini explains those results in plain language. This prevents the model from inventing government schemes or pretending that an AI response is an official eligibility decision.

## Run locally

1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.
5. Click **✨ Check My Privileges**.

The site works without a Gemini key using the local rules.

## Enable Gemini

Create a Gemini API key in Google AI Studio, then set it as a server environment variable:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

Never put the key inside `index.html` or commit it to GitHub. For Vercel, add the variables under the project's Environment Variables and redeploy.

## Vercel

- Import the repository into Vercel.
- Keep `vercel.json` in the repository root.
- Add `GEMINI_API_KEY` as a Vercel environment variable if you want Gemini explanations.
- `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`.
- `/api/health` confirms the deployment is alive.
- `/api/privileges` performs the privilege scan.

## Important project limitation

The included eligibility rules are a **student-project prototype**, not a national government eligibility database. Government rules, dates, income limits, documents and application processes can change. Every result is therefore labelled as a potential match and links to an official information page for verification.

For a production system, the scheme catalogue and rules should be maintained from authoritative government sources, with source dates, versioning, consent, audit logs and secure identity/data handling.

## Security

- Do not commit `.env` or real API keys.
- Do not collect passwords, OTPs, PINs or full bank-account numbers.
- The browser demo stores its profile in localStorage.
- API keys remain server-side.

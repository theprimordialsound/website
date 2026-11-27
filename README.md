# The Primordial Sound

Website for The Primordial Sound.

This repository contains a responsive static website for The Primordial Sound, including the home page and recording-template page.

## Local preview

With Python 3 installed, run a local static server from the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. This static preview does not run `/api/booking`; install the Vercel CLI, link the project, configure local server-side environment variables, and run `vercel dev` to test the serverless route.

There is no build step or dependency installation required. Deploy the repository root to Vercel to serve the site and its booking API. Static-only hosting can serve the pages and assets, but cannot run the booking endpoint.

The supplied logo variants and selected photography from the Figma prototype are in `assets/`.

## Clean page URLs

Vercel serves the home page at `/`, redirects `/index.html` to `/`, and removes `.html` extensions from page URLs. This behavior is configured in `vercel.json`; local preview servers may not apply those redirects.

## Booking requests

The booking form posts to the Vercel serverless route at `/api/booking`, which sends a transactional email to `hello@theprimordialsound.com` through the Resend API. The page reports success only after Resend accepts the message.

### Configure email

1. Create a Resend account, verify a sending domain you control, and create an API key in the Resend dashboard. The receiving address is fixed in `api/booking.js`; the sender must use the verified domain. The HTTPS API avoids putting SMTP credentials or a mail transport in the browser.
2. Deploy this repository as a Vercel project. In the Vercel project settings, add these environment variables for each environment you deploy:
   - `RESEND_API_KEY`: the Resend API key. Keep it only in Vercel's server-side environment settings.
   - `BOOKING_FROM_EMAIL`: a verified sender, for example `The Primordial Sound <bookings@your-verified-domain.com>`.
3. Redeploy after setting or changing environment variables. Submit a test booking and check that the form displays its sent confirmation; otherwise it will show an actionable failure state.

The API accepts only same-origin JSON POST requests, validates and length-limits every field, permits only the service options shown in the form, and rejects a filled honeypot field. Provider errors are logged server-side and are not exposed as success to the visitor.

The application source, including `api/booking.js`, may be visible in a public repository. The Resend API key and sender configuration must remain in Vercel environment variables; never commit them or place them in browser JavaScript. No email provider account or live deployment is configured by this repository.

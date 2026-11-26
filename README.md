# The Primordial Sound

Website for The Primordial Sound.

This repository contains a responsive static website for The Primordial Sound, including the home page and recording-template page.

## Local preview

With Python 3 installed, run a local static server from the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

There is no build step or dependency installation required. A static hosting service can deploy the repository root.

The supplied logo variants and selected photography from the Figma prototype are in `assets/`.

## Audio comparisons

The Listen section reads `data/audio.json`. Each track has `title`, `category`, `service`, and `duration` fields, plus `before` and `after` objects with a `label` and `url`. Add each audio URL when the files are available; until then, leave the URL as `null`. The player stays disabled until usable audio is provided. URLs may be repository-relative paths or HTTP(S) links.

## Booking requests

The booking form is wired to a Google Apps Script web app. It is intentionally unconfigured until you deploy the handler; the form will not report a request as sent until the handler confirms that `MailApp.sendEmail` succeeded.

1. Sign in to the Google account that should send booking emails and open [Google Apps Script](https://script.google.com/).
2. Create a project, replace the starter code with `apps-script/Code.gs`, and save it.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to your account and **Who has access** to **Anyone**, then deploy and authorize the requested mail-sending permission.
4. Copy the deployed web app URL ending in `/exec` into `bookingEndpoint` in `scripts/config.js`. The URL is configuration, not a credential; do not put account passwords, API keys, or other secrets in this repository.
5. Publish the updated static site and submit a test request. The script emails booking details to `hello@theprimordialsound.com` and uses the submitter's address as `Reply-To`.

The public web app validates and limits form fields and briefly rate-limits repeat submissions from the same email address. Apps Script quotas and deployment access settings apply. Until a valid deployment URL is configured, the form explains that requests cannot be sent and provides the contact email as a fallback. The web app has not been deployed or authorized from this repository.

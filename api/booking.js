const RECIPIENT = "hello@theprimordialsound.com";
const MAX_LENGTHS = Object.freeze({
  name: 120,
  email: 254,
  message: 3000,
  website: 200,
});
const ALLOWED_SERVICES = new Set([
  "Live Mixing",
  "Mixing & Mastering",
  "Session Guitarist",
  "Session Drummer",
  "Song Setup",
]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  };

  if (!isSameOriginRequest(req)) {
    return sendJson(res, 403, { error: "origin_not_allowed" });
  }

  const contentType = req.headers["content-type"] || "";
  const mediaType = contentType.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return sendJson(res, 415, { error: "unsupported_media_type" });
  }

  const booking = validateBooking(req.body);
  if (!booking.valid) {
    return sendJson(res, 400, { error: "invalid_booking" });
  }
  if (booking.website) {
    return sendJson(res, 400, { error: "invalid_booking" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL;
  if (!apiKey || !from) {
    return sendJson(res, 503, { error: "email_not_configured" });
  }

  const serviceSummary = booking.services.length
    ? booking.services.join(", ")
    : "New inquiry";
  const text = [
    "A booking request was submitted from the website.",
    "",
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Services: ${serviceSummary}`,
    "",
    "A little about the project:",
    booking.message,
  ].join("\n");

  try {
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [RECIPIENT],
        reply_to: booking.email,
        subject: `Website booking request: ${serviceSummary}`,
        text,
      }),
    });

    if (!providerResponse.ok) {
      console.error(`Resend rejected booking email with status ${providerResponse.status}.`);
      return sendJson(res, 502, { error: "email_delivery_failed" });
    }

    const providerResult = await providerResponse.json();
    if (!providerResult || typeof providerResult.id !== "string" || !providerResult.id) {
      console.error("Resend accepted booking request without returning an email ID.");
      return sendJson(res, 502, { error: "email_delivery_failed" });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Booking email provider request failed.", error);
    return sendJson(res, 502, { error: "email_delivery_failed" });
  }
}

function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = String(forwardedHost || req.headers.host || "").split(",")[0].trim();
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = String(
    forwardedProtocol
      ? forwardedProtocol.split(",")[0].trim()
      : req.socket && req.socket.encrypted
        ? "https"
        : "http"
  ).replace(/:$/, "");

  if (!origin || !host || !["http", "https"].includes(protocol)) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const expectedOrigin = new URL(`${protocol}://${host}`).origin;
    if (
      originUrl.origin !== origin
      || originUrl.origin !== expectedOrigin
      || originUrl.username
      || originUrl.password
    ) {
      return false;
    }

    const fetchSite = req.headers["sec-fetch-site"];
    return !fetchSite || fetchSite === "same-origin";
  } catch {
    return false;
  }
}

function validateBooking(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false };
  }

  const lengthsValid = isWithinLimit(body.name, MAX_LENGTHS.name)
    && isWithinLimit(body.email, MAX_LENGTHS.email)
    && isWithinLimit(body.message, MAX_LENGTHS.message)
    && isWithinLimit(body.website, MAX_LENGTHS.website);
  const name = cleanText(body.name, MAX_LENGTHS.name);
  const email = cleanText(body.email, MAX_LENGTHS.email).toLowerCase();
  const message = cleanText(body.message, MAX_LENGTHS.message, true);
  const website = cleanText(body.website, MAX_LENGTHS.website);
  const services = body.services;
  const validServices = Array.isArray(services)
    && services.length <= ALLOWED_SERVICES.size
    && services.every((service) => typeof service === "string" && ALLOWED_SERVICES.has(service))
    && new Set(services).size === services.length;

  return {
    valid: Boolean(
      name
      && email
      && message
      && lengthsValid
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      && validServices
    ),
    name,
    email,
    message,
    website,
    services: validServices ? services : [],
  };
}

function isWithinLimit(value, maximumLength) {
  return typeof value === "string" && value.length <= maximumLength;
}

function cleanText(value, maximumLength, allowNewlines = false) {
  if (typeof value !== "string") {
    return "";
  }
  const cleaned = allowNewlines
    ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    : value.replace(/[\r\n\t\u0000-\u001F\u007F]/g, " ");
  return cleaned.trim().slice(0, maximumLength);
}

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
}

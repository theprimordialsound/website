const BOOKING_RECIPIENT = "hello@theprimordialsound.com";
const RECENT_REQUEST_SECONDS = 60;

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const nonce = String(parameters.nonce || "");

  if (!/^[a-f0-9]{32}$/.test(nonce)) {
    return responsePage(false, "");
  }

  const booking = validateBooking(parameters);
  if (!booking.valid) {
    return responsePage(false, nonce);
  }

  if (booking.website) {
    return responsePage(false, nonce);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return responsePage(false, nonce);
  }

  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = recentRequestKey(booking.email);
    if (cache.get(cacheKey)) {
      return responsePage(false, nonce);
    }

    const subject = `Website booking request: ${booking.service}`;
    const body = [
      "A booking request was submitted from the website.",
      "",
      `Name: ${booking.name}`,
      `Email: ${booking.email}`,
      `Service: ${booking.service}`,
      "",
      "Project details:",
      booking.message,
    ].join("\n");

    MailApp.sendEmail(BOOKING_RECIPIENT, subject, body, {
      replyTo: booking.email,
    });
    try {
      cache.put(cacheKey, "sent", RECENT_REQUEST_SECONDS);
    } catch (cacheError) {
      console.error(`Booking rate-limit cache update failed: ${cacheError.message}`);
    }
    return responsePage(true, nonce);
  } catch (error) {
    console.error(`Booking email delivery failed: ${error.message}`);
    return responsePage(false, nonce);
  } finally {
    lock.releaseLock();
  }
}

function validateBooking(parameters) {
  const name = cleanSingleLine(parameters.name, 120);
  const email = cleanSingleLine(parameters.email, 254).toLowerCase();
  const service = cleanSingleLine(parameters.service, 100);
  const message = cleanMessage(parameters.message, 3000);
  const website = cleanSingleLine(parameters.website, 200);

  return {
    valid: Boolean(
      name
      && service
      && message
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ),
    name,
    email,
    service,
    message,
    website,
  };
}

function cleanSingleLine(value, maximumLength) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function cleanMessage(value, maximumLength) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maximumLength);
}

function recentRequestKey(email) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    email,
    Utilities.Charset.UTF_8
  );
  const emailHash = digest
    .map((value) => ((value + 256) % 256).toString(16).padStart(2, "0"))
    .join("");
  return `recent_${emailHash}`;
}

function responsePage(sent, nonce) {
  const response = JSON.stringify({
    type: "tps-booking-response",
    status: sent ? "sent" : "failed",
    nonce,
  });
  const html = [
    "<!doctype html>",
    '<meta charset="utf-8">',
    "<script>",
    `window.parent.postMessage(${response}, "*");`,
    "</script>",
  ].join("");

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

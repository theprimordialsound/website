const demoList = document.querySelector("#demo-list");

if (demoList) {
  loadAudioManifest(demoList.dataset.audioManifest);
}

async function loadAudioManifest(manifestPath) {
  try {
    const response = await fetch(manifestPath);
    if (!response.ok) {
      throw new Error(`Audio manifest request failed: ${response.status}`);
    }

    const manifest = await response.json();
    const tracks = validateManifest(manifest);

    demoList.replaceChildren();
    if (tracks.length === 0) {
      showMessage("No demos are available yet.", "empty");
      return;
    }

    tracks.forEach((track, index) => {
      demoList.append(createTrackElement(track, index));
    });
  } catch (error) {
    console.error("Unable to load audio comparisons.", error);
    showMessage("Audio comparisons could not be loaded. Check the audio manifest and try again.", "error");
  }
}

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.tracks)) {
    throw new TypeError('The audio manifest must contain a "tracks" array.');
  }

  return manifest.tracks.map((track, index) => {
    if (!track || typeof track.title !== "string" || track.title.trim() === "") {
      throw new TypeError(`Audio track ${index + 1} must have a title.`);
    }

    for (const field of ["category", "service", "duration"]) {
      if (typeof track[field] !== "string" || track[field].trim() === "") {
        throw new TypeError(`Audio track ${index + 1} must have ${field} text.`);
      }
    }

    return {
      title: track.title.trim(),
      category: track.category.trim(),
      service: track.service.trim(),
      duration: track.duration.trim(),
      before: validateAudioSide(track.before, index, "before"),
      after: validateAudioSide(track.after, index, "after"),
    };
  });
}

function validateAudioSide(side, trackIndex, sideName) {
  if (!side || typeof side.label !== "string" || side.label.trim() === "") {
    throw new TypeError(`Audio track ${trackIndex + 1} needs a ${sideName} label.`);
  }

  let url = null;
  if (side.url !== null && side.url !== undefined && side.url !== "") {
    if (typeof side.url !== "string") {
      throw new TypeError(`Audio track ${trackIndex + 1} has an invalid ${sideName} URL.`);
    }

    const parsedUrl = new URL(side.url, document.baseURI);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new TypeError(`Audio track ${trackIndex + 1} has an unsupported ${sideName} URL.`);
    }
    url = parsedUrl.href;
  }

  return { label: side.label.trim(), url };
}

function createTrackElement(track, index) {
  const article = document.createElement("article");
  article.className = "demo-row";

  const number = document.createElement("span");
  number.className = "demo-row__number";
  number.textContent = String(index + 1).padStart(2, "0");

  const audio = document.createElement("audio");
  audio.className = "demo-row__audio";
  audio.preload = "none";
  audio.setAttribute("aria-label", `${track.title} audio comparison`);

  const playableSides = [track.before, track.after].filter((side) => side.url);
  let activeSide = track.after.url ? "after" : "before";
  let isPlaying = false;

  const playButton = document.createElement("button");
  playButton.className = "play-button";
  playButton.type = "button";
  playButton.disabled = playableSides.length === 0;
  playButton.setAttribute("aria-label", `Play ${track.title}`);
  playButton.setAttribute("aria-pressed", "false");
  playButton.title = playableSides.length ? "Play audio sample" : "Audio files have not been added yet";

  const playIcon = document.createElement("span");
  playIcon.className = "play-icon";
  playIcon.setAttribute("aria-hidden", "true");
  playButton.append(playIcon);

  const text = document.createElement("div");
  text.className = "demo-row__text";
  const title = document.createElement("h3");
  title.className = "demo-row__title";
  title.textContent = track.title;
  const meta = document.createElement("p");
  meta.className = "demo-row__meta";
  meta.textContent = `${track.category} / ${track.service}`;
  text.append(title, meta);

  const waveform = document.createElement("div");
  waveform.className = "demo-wave demo-row__wave";
  waveform.setAttribute("aria-hidden", "true");
  for (let barIndex = 0; barIndex < 44; barIndex += 1) {
    const bar = document.createElement("span");
    const height = 18 + Math.abs(Math.sin((barIndex + 1) * 1.7)) * 82;
    bar.style.setProperty("--bar-height", `${height.toFixed(1)}%`);
    waveform.append(bar);
  }

  const duration = document.createElement("span");
  duration.className = "demo-row__duration";
  duration.textContent = track.duration;

  const modeButton = document.createElement("button");
  modeButton.className = "demo-mode";
  modeButton.type = "button";
  modeButton.disabled = !track.before.url || !track.after.url;
  modeButton.textContent = modeLabel(activeSide);
  modeButton.setAttribute("aria-label", `Switch ${track.title} comparison to ${modeLabel(activeSide)}`);
  modeButton.title = modeButton.disabled
    ? "Both before and after audio files are required"
    : "Switch between the before and after audio";

  function setActiveSide(sideName) {
    activeSide = sideName;
    audio.src = track[sideName].url;
    modeButton.textContent = modeLabel(sideName);
    modeButton.setAttribute("aria-label", `Switch ${track.title} comparison to ${modeLabel(sideName)}`);
  }

  function stopPlayback() {
    isPlaying = false;
    playButton.setAttribute("aria-pressed", "false");
    playButton.setAttribute("aria-label", `Play ${track.title}`);
  }

  playButton.addEventListener("click", async () => {
    if (isPlaying) {
      audio.pause();
      stopPlayback();
      return;
    }

    if (audio.src !== track[activeSide].url) {
      setActiveSide(activeSide);
    }

    try {
      await audio.play();
      isPlaying = true;
      playButton.setAttribute("aria-pressed", "true");
      playButton.setAttribute("aria-label", `Pause ${track.title}`);
    } catch (error) {
      console.error(`Unable to play audio for "${track.title}".`, error);
      stopPlayback();
    }
  });

  modeButton.addEventListener("click", () => {
    const nextSide = activeSide === "before" ? "after" : "before";
    const resumePlayback = isPlaying;
    audio.pause();
    stopPlayback();
    setActiveSide(nextSide);
    if (resumePlayback) {
      playButton.click();
    }
  });

  audio.addEventListener("ended", stopPlayback);
  audio.addEventListener("pause", () => {
    if (isPlaying) {
      stopPlayback();
    }
  });
  audio.addEventListener("error", () => {
    stopPlayback();
    console.error(`Unable to load audio for "${track.title}" (${activeSide}).`);
  });

  article.append(number, playButton, text, waveform, duration, modeButton, audio);
  return article;
}

function modeLabel(sideName) {
  return sideName === "before" ? "Before" : "After";
}

function showMessage(message, type) {
  const paragraph = document.createElement("p");
  paragraph.className = `demo-list__${type}`;
  paragraph.textContent = message;
  demoList.replaceChildren(paragraph);
}

const bookingDialog = document.querySelector("#booking-dialog");

if (bookingDialog) {
  setupBookingForm(bookingDialog);
}

function setupBookingForm(dialog) {
  const form = dialog.querySelector("#booking-form");
  const frame = dialog.querySelector(".booking-response-frame");
  const status = dialog.querySelector("#booking-status");
  const submitButton = form.querySelector(".booking-form__submit");
  const closeButton = dialog.querySelector(".booking-dialog__close");
  const endpoint = getBookingEndpoint(window.TPS_CONFIG?.bookingEndpoint);
  let activeNonce = "";
  let responseTimeout;

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  if (endpoint) {
    form.action = endpoint.href;
    submitButton.disabled = false;
  } else {
    showStatus("The booking form is not configured yet. Please email hello@theprimordialsound.com.", "error");
  }

  document.querySelectorAll("[data-booking-open]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      if (!dialog.open) {
        dialog.showModal();
      }
      if (!endpoint) {
        showStatus("The booking form is not configured yet. Please email hello@theprimordialsound.com.", "error");
      }
    });
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  form.addEventListener("submit", (event) => {
    if (!endpoint) {
      event.preventDefault();
      showStatus("The booking form is not configured yet. Please email hello@theprimordialsound.com.", "error");
      return;
    }

    activeNonce = createBookingNonce();
    if (!activeNonce) {
      event.preventDefault();
      showStatus("This browser could not securely prepare your request. Please email hello@theprimordialsound.com.", "error");
      return;
    }

    form.elements.namedItem("nonce").value = activeNonce;
    submitButton.disabled = true;
    showStatus("Sending your booking request…", "pending");
    window.clearTimeout(responseTimeout);
    responseTimeout = window.setTimeout(() => {
      submitButton.disabled = false;
      showStatus("We couldn’t confirm delivery. Please try again or email hello@theprimordialsound.com.", "error");
    }, 45000);
  });

  window.addEventListener("message", (event) => {
    if (
      event.source !== frame.contentWindow
      || !isBookingResponseOrigin(event.origin)
      || !event.data
      || event.data.type !== "tps-booking-response"
      || event.data.nonce !== activeNonce
    ) {
      return;
    }

    window.clearTimeout(responseTimeout);
    submitButton.disabled = false;
    if (event.data.status === "sent") {
      form.reset();
      activeNonce = "";
      showStatus("Your booking request was sent. We’ll be in touch soon.", "success");
    } else {
      showStatus("Your request could not be sent. Please try again or email hello@theprimordialsound.com.", "error");
    }
  });
}

function getBookingEndpoint(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.hostname !== "script.google.com"
      || url.username
      || url.password
      || url.port
      || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(url.pathname)
      || url.search
      || url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isBookingResponseOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "script.google.com" || hostname.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

function createBookingNonce() {
  if (!window.crypto?.getRandomValues) {
    return "";
  }
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
  const closeButton = dialog.querySelector(".booking-dialog__close");

  document.querySelectorAll("[data-booking-open]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      if (!dialog.open) {
        dialog.showModal();
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
    event.preventDefault();
    window.location.href = buildBookingMailto(form);
  });
}

function buildBookingMailto(form) {
  const formData = new FormData(form);
  const services = formData.getAll("services");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const project = String(formData.get("message") || "").trim();
  const body = [
    "Hello,",
    "",
    "I'd like to talk about a session.",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Services: ${services.length ? services.join(", ") : "Not specified"}`,
    "",
    "A little about my project:",
    project,
  ].join("\n");
  const parameters = new URLSearchParams({
    subject: `Booking request - ${name}`,
    body,
  });

  return `mailto:hello@theprimordialsound.com?${parameters.toString()}`;
}

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
    console.error("Unable to load audio tracks.", error);
    showMessage("Audio tracks could not be loaded. Check the audio manifest and try again.", "error");
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
      audioUrl: validateAudioUrl(track.audio, index),
    };
  });
}

function validateAudioUrl(audioUrl, trackIndex) {
  let url = null;
  if (audioUrl !== null && audioUrl !== undefined && audioUrl !== "") {
    if (typeof audioUrl !== "string") {
      throw new TypeError(`Audio track ${trackIndex + 1} has an invalid audio URL.`);
    }

    const parsedUrl = new URL(audioUrl, document.baseURI);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new TypeError(`Audio track ${trackIndex + 1} has an unsupported audio URL.`);
    }
    url = parsedUrl.href;
  }

  return url;
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
  audio.setAttribute("aria-label", `${track.title} audio`);
  if (track.audioUrl) {
    audio.src = track.audioUrl;
  }

  let isPlaying = false;

  const playButton = document.createElement("button");
  playButton.className = "play-button";
  playButton.type = "button";
  playButton.disabled = !track.audioUrl;
  playButton.setAttribute("aria-label", `Play ${track.title}`);
  playButton.setAttribute("aria-pressed", "false");
  playButton.title = track.audioUrl ? "Play audio sample" : "Audio file has not been added yet";

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
  const waveformBars = [];
  const barCount = 96;
  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const bar = document.createElement("span");
    const position = barIndex + 1;
    const height = 24 + Math.abs(Math.sin(position * 1.7 + Math.sin(position * 0.43) * 2)) * 76;
    bar.style.setProperty("--bar-height", `${height.toFixed(1)}%`);
    bar.classList.toggle("is-played", barIndex < Math.ceil(barCount * 0.24));
    waveform.append(bar);
    waveformBars.push(bar);
  }

  function updateWaveformProgress(progress) {
    const playedCount = Math.ceil(Math.max(0, Math.min(1, progress)) * waveformBars.length);
    waveformBars.forEach((bar, barIndex) => {
      bar.classList.toggle("is-played", barIndex < playedCount);
    });
  }

  const duration = document.createElement("span");
  duration.className = "demo-row__duration";
  duration.textContent = track.duration;

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

  audio.addEventListener("ended", stopPlayback);
  audio.addEventListener("timeupdate", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      updateWaveformProgress(audio.currentTime / audio.duration);
    }
  });
  audio.addEventListener("pause", () => {
    if (isPlaying) {
      stopPlayback();
    }
  });
  audio.addEventListener("error", () => {
    stopPlayback();
    console.error(`Unable to load audio for "${track.title}".`);
  });

  article.append(number, playButton, text, waveform, duration, audio);
  return article;
}

function showMessage(message, type) {
  const paragraph = document.createElement("p");
  paragraph.className = `demo-list__${type}`;
  paragraph.textContent = message;
  demoList.replaceChildren(paragraph);
}

const bookingDialog = document.querySelector("#booking-dialog");
const bookingFooter = document.querySelector("#booking-footer");

if (bookingDialog) {
  setupBookingForm(bookingDialog);
  bookingFooter?.addEventListener("click", () => {
    if (!bookingDialog.open) {
      bookingDialog.showModal();
    }
  });
}

function setupBookingForm(dialog) {
  const form = dialog.querySelector("#booking-form");
  const closeButton = dialog.querySelector(".booking-dialog__close");
  const submitButton = form.querySelector(".booking-form__submit");
  const status = form.querySelector(".booking-form__status");
  let isSubmitting = false;

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    showStatus("Sending your booking request…", "pending");

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(bookingPayload(form)),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The booking service returned an unreadable response.");
      }

      if (!response.ok || result?.ok !== true) {
        if (result?.error === "email_not_configured") {
          showStatus("Booking email is not configured yet. Please try again later.", "error");
        } else {
          showStatus("We couldn’t send your request right now. Please try again.", "error");
        }
        return;
      }

      form.reset();
      showStatus("Your request was sent. We’ll be in touch soon.", "success");
    } catch (error) {
      console.error("Booking request failed.", error);
      showStatus("We couldn’t send your request right now. Please try again.", "error");
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
    }
  });
}

function bookingPayload(form) {
  return {
    name: form.elements.namedItem("name").value,
    email: form.elements.namedItem("email").value,
    services: [...form.querySelectorAll('input[name="services"]:checked')].map((input) => input.value),
    message: form.elements.namedItem("message").value,
    website: form.elements.namedItem("website").value,
  };
}

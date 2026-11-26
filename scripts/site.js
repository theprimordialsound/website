const audioList = document.querySelector("#audio-list");

if (audioList) {
  loadAudioManifest(audioList.dataset.audioManifest);
}

async function loadAudioManifest(manifestPath) {
  try {
    const response = await fetch(manifestPath);
    if (!response.ok) {
      throw new Error(`Audio manifest request failed: ${response.status}`);
    }

    const manifest = await response.json();
    const tracks = validateManifest(manifest);

    audioList.replaceChildren();
    if (tracks.length === 0) {
      showAudioMessage("Audio comparisons will appear here when the audio files are added.");
      return;
    }

    for (const track of tracks) {
      audioList.append(createTrackElement(track));
    }
  } catch (error) {
    console.error("Unable to load audio comparisons.", error);
    showAudioMessage("Audio comparisons could not be loaded. Check the audio manifest and try again.");
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

    return {
      title: track.title.trim(),
      before: validateAudioSide(track.before, index, "before"),
      after: validateAudioSide(track.after, index, "after"),
    };
  });
}

function validateAudioSide(side, trackIndex, sideName) {
  if (!side || typeof side.label !== "string" || side.label.trim() === "") {
    throw new TypeError(`Audio track ${trackIndex + 1} needs a ${sideName} label.`);
  }
  if (typeof side.url !== "string" || side.url.trim() === "") {
    throw new TypeError(`Audio track ${trackIndex + 1} needs a ${sideName} URL.`);
  }

  const url = new URL(side.url, document.baseURI);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(`Audio track ${trackIndex + 1} has an unsupported ${sideName} URL.`);
  }

  return { label: side.label.trim(), url: url.href };
}

function createTrackElement(track) {
  const article = document.createElement("article");
  article.className = "audio-track";

  const title = document.createElement("h3");
  title.className = "audio-track__title";
  title.textContent = track.title;
  article.append(title);

  const comparison = document.createElement("div");
  comparison.className = "audio-comparison";
  comparison.append(
    createAudioSide(track.title, track.before, "before"),
    createAudioSide(track.title, track.after, "after"),
  );
  article.append(comparison);
  return article;
}

function createAudioSide(trackTitle, side, sideName) {
  const section = document.createElement("section");
  section.className = `audio-side audio-side--${sideName}`;

  const label = document.createElement("h4");
  label.className = "audio-side__label";
  label.textContent = side.label;

  const waveform = document.createElement("div");
  waveform.className = "audio-waveform";
  waveform.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 36; index += 1) {
    const bar = document.createElement("span");
    const height = 18 + Math.abs(Math.sin((index + 1) * 1.7)) * 82;
    bar.style.setProperty("--bar-height", `${height.toFixed(1)}%`);
    waveform.append(bar);
  }

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  audio.src = side.url;
  audio.setAttribute("aria-label", `${trackTitle} — ${side.label}`);

  section.append(label, waveform, audio);
  return section;
}

function showAudioMessage(message) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = message;
  audioList.replaceChildren(paragraph);
}

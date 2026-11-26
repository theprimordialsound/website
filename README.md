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

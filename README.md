# LithOS

The portfolio of **Naji Ullah**, full-stack software engineer in Lahore, built as a desktop operating system that runs in the browser.

**Live:** https://naji-ullah.github.io/lithos/ · **Portfolio:** https://naji.codes/

It boots like a real Linux machine (GRUB menu, kernel log, systemd), then drops you at a login screen and a full desktop. The name comes from *lithology*, the rock column in a borehole log, which is the theme of naji.codes.

## What's inside

- **Desktop:** draggable icons, right-click menus, window snapping, taskbar, app launcher with search, notifications, calendar, Wi-Fi and volume menus, Night shift / Day shift themes, generated wallpapers.
- **Portfolio:** `README.md` bio, seven projects in `~/Projects`, a two-page résumé, skills shown as processes in System Monitor, contact card.
- **Terminal:** `ls`, `cd`, `cat`, `tree`, `neofetch`, `man naji`, `git log`, `sudo apt install react`, `fortune`, tab completion and history.
- **Web browser:** real pages load in sandboxed frames. Google search, Wikipedia, YouTube videos and most sites work; sites that refuse embedding (GitHub, LinkedIn, X) open in a new tab.
- **Games:** DOOM (shareware, the original engine in WebAssembly), Canal Run (3D night street racer on Three.js), Solitaire, Chess (vs. an alpha-beta engine), 2048, Brickfall, Mines, Snake.

Add `#desktop` to the URL to skip the boot and login.

## Project layout

```
index.html     built, self-contained OS (what GitHub Pages serves)
doom.wasm      DOOM engine + shareware episode, fetched only when DOOM opens
src/           source: styles, markup and JS modules
build.sh       rebuilds index.html from src/
```

No framework and no build tooling beyond `build.sh`. Three.js is loaded from cdnjs the first time Canal Run opens.

## Credits

- DOOM © id Software. `doom.wasm` contains the freely redistributable **DOOM shareware v1.10** episode and the GPL-2.0 DOOM engine compiled to WebAssembly by Cornelius Diekmann ([wasm-fizzbuzz](https://github.com/diekmann/wasm-fizzbuzz/tree/gh-pages/doom)), packaged by [wasm-doom](https://github.com/iam-medvedev/wasm-doom). Engine source: [id-Software/DOOM](https://github.com/id-Software/DOOM).
- [Three.js](https://threejs.org/) (MIT) for the racer.
- Fonts: Red Hat Display / Text, JetBrains Mono and VT323 from Google Fonts.

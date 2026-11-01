<div align="center">

<img src="https://cdn.abdullahcxd.org/files/tenonkit/readme-banner.png" alt="Tenonkit: build websites from components. Drag sections onto a page, edit their HTML, React and CSS, and export a clean site." width="100%" />

[Website](https://tenonkit.com) · [Download](https://tenonkit.com/download) · [Docs](https://docs.tenonkit.com/builder) · [Releases](../../releases)

![CI](../../actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

</div>

Tenonkit is a desktop app for Windows, macOS and Linux. Put a page together from ready-made sections, edit each one's HTML, JSX and CSS side by side with a live canvas, and export a single HTML file or a complete React project. Everything stays on your computer.

## Features

- **Components, not templates.** Every website is built from blocks. Any block can be saved as a reusable component, written in HTML or React, and shows up in all your projects.
- **Real code.** Each block is plain HTML or a React component (`export default function …`), with its own CSS. There's no hidden format and no lock-in.
- **Tailwind CSS v4.** Add `@import "tailwindcss";` to the page CSS and classes compile as you type. Your `:root` design tokens work as classes (`bg-brand`, `text-ink`).
- **Design tab.** Click any element to change its font, spacing, colours, border and radius without code. Changes are written as readable CSS, and edits you make by hand show up in the panel.
- **Live preview.** Open the page in your browser from a local server. The React preview runs your components for real (state, events, effects) and reloads as you edit.
- **Export.** A single HTML file with everything inlined, or a Vite + React project with one file per component and Tailwind already set up.
- **Make it yours.** Light, dark and high-contrast themes, custom `.tenontheme` themes you can share, accent colours, interface size, fonts, and performance settings for slower machines.

## Install

Download the installer for your system from [tenonkit.com/download](https://tenonkit.com/download) or the [latest release](../../releases/latest):

| System  | File                                  |
| ------- | ------------------------------------- |
| Windows | `Tenonkit-<version>-setup.exe`        |
| macOS   | `Tenonkit-<version>.dmg`              |
| Linux   | `Tenonkit-<version>.AppImage`, `.deb` |

Installed builds open `.tenon` project files and `.tenontheme` theme files on double-click, and check for updates when they start. Uninstalling never deletes your projects.

## Keyboard shortcuts

| Action          | Shortcut              |
| --------------- | --------------------- |
| Undo / redo     | Ctrl+Z / Ctrl+Shift+Z |
| Duplicate block | Ctrl+D                |
| Delete block    | Del                   |
| Save now        | Ctrl+S                |
| Settings        | Ctrl+,                |
| Deselect        | Esc                   |

On macOS, use Cmd instead of Ctrl.

## Building from source

You need [Bun](https://bun.sh) 1.4+ and a current Node LTS.

```bash
bun install
npm run dev          # run the app with hot reload
npm run check        # typecheck, lint and unit tests
npm run build:win    # installer in dist/ (also build:mac, build:linux)
```

Builds you make yourself are unsigned, so Windows and macOS may warn when you open them.

### Project structure

| Path                | Contents                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/main/`         | Electron main process: window, `app://` protocol and CSP, IPC, project storage                            |
| `src/preload/`      | The only bridge between the page and the main process (`window.api`)                                      |
| `src/shared/`       | Project format and validation, settings and themes, shared by both sides                                  |
| `src/renderer/src/` | React UI. `render.ts` compiles Tailwind and runs JSX in a worker; `store.ts` holds editing state and undo |
| `build/`            | Icons and installer artwork                                                                               |

### Security

- The interface runs sandboxed with context isolation and no Node access. Every IPC call checks its sender and validates its arguments.
- The app is served from `app://bundle` with a strict Content Security Policy: no eval, no remote scripts, no navigation, no network access and no device permissions.
- Your JSX runs only in a Web Worker with no network access. HTML on the canvas can't run scripts.
- Project files are written atomically, and project ids are validated so a file can't escape the projects folder.

Found a vulnerability? Please email hello@tenonkit.com instead of opening a public issue.

### Logs

`%APPDATA%\Tenonkit\logs\main.log` on Windows, `~/Library/Logs/Tenonkit` on macOS, `~/.config/Tenonkit/logs` on Linux.

## Releasing

Bump `version` in `package.json`, push, then run **Actions → Release → Run workflow**. It runs the checks, builds Windows, macOS and Linux, and creates the GitHub release `v<version>` with all installers attached (as a draft by default).

## License

[MIT](LICENSE)

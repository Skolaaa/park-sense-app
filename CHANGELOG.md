# Changelog

All notable changes to ParkSense are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the app is pre-1.0, the minor version carries user-facing change and the
patch version carries fixes; nothing here is treated as a stable public API yet.

## [Unreleased]

### Security
- The build now fails if a credential reaches the client bundle, or if client
  code reads a `REACT_APP_*` variable whose name implies a secret. This runs as
  a `postbuild` hook, so it blocks a deploy rather than reporting after the
  fact.

### Added
- A recovery screen when the app hits an unexpected error. Instead of a blank
  white page you get an explanation and a way back, and a running parking
  timer survives either route.
- Continuous integration: the full test suite and a production build now run
  on every pull request and push to main.

### Changed
- Redesigned every screen. The verdict — whether you can park — is now the
  only loud thing on screen, sized to be read at arm's length on a bright
  street, with the detail below it as a plain spec list. Replaces a layout
  that spread six competing accent colours across seven pastel cards.
- A weak read no longer shows a confident-looking result behind a warning
  banner. When the sign is only partly legible the app says so, shows what it
  could read, and asks you to retake — with the result still available if you
  want it.
- The results screen now shows what time your parking runs out, not just how
  long you have.
- Camera errors tell you what to do. A denied permission is now distinguished
  from a busy camera, each with its own instruction.
- Styling is now compiled at build time instead of being generated in the
  browser by the Tailwind CDN script. The app no longer waits on a
  third-party request before it can paint, and it renders correctly with no
  network connection.

### Fixed
- The app icon and touch icon were referenced but missing, so every page load
  requested two files that did not exist. There is now a real ParkSense icon.
- Full-height screens no longer jump as Safari's toolbar collapses on iOS.
- The app no longer hangs on "Analysing" when a photo cannot be read. An
  unreadable image now says so and offers a retake.
- The version shown on the home screen matches the released version. It had
  been stuck at 1.0.0 since the first commit.
- Buttons respond to a press. The only feedback was a hover effect, which
  phones do not have and which latched on after a tap.
- Headings that break across two lines are no longer announced as one run-on
  word by screen readers.
- Keyboard focus is visible. It had no indicator anywhere in the app.
- The safe-area padding on the timer bar and notification banner now applies;
  both referenced CSS classes that were never defined.

## [0.5.0] — 2026-08-24

### Added
- Rate limiting on `/api/analyze`: 10 requests per minute per IP, answered with
  `429` and a `Retry-After` header.
- 45-second timeout on analysis requests so a hung upstream call surfaces as a
  timeout rather than an indefinite spinner.
- In-app camera error screen that distinguishes a denied permission from a
  general device failure, replacing a browser `alert()`.
- First test suite in the project — 85 cases across 7 suites covering the
  analyze endpoint, the analysis service and its mock fallbacks, the timer,
  location and notification services, sign time parsing, and camera capture.

### Fixed
- Camera was torn down and re-acquired on every parent render — once a second
  while a parking timer was running — because `onCancel` sat in an effect
  dependency array that no longer referenced it.
- Rate-limit store grew for the lifetime of a warm serverless instance; expired
  windows are now swept.
- Unhandled promise rejection from the fire-and-forget location update in
  `app.js`.

## [0.4.0] — 2026-04-13

### Security
- Moved the OpenAI API key server-side behind a Vercel serverless proxy so it is
  no longer bundled into the browser.

### Changed
- More robust JSON parsing of model responses, with error detail surfaced.
- Clearer confidence messaging, and an explicit "no sign found" result.

### Fixed
- `/api/analyze` routing, plus error visibility on the preview screen.

## [0.3.0] — 2026-04-12

### Added
- Phase 2: directional sign handling, parking timer, notifications, and location
  capture.

### Fixed
- Case-sensitive import paths that broke the Linux build on Vercel.
- `react-hooks/exhaustive-deps` warning in `CameraCapture`.

## [0.2.0] — 2025-07-12

### Added
- Real OpenAI GPT-4V analysis, replacing the mocked responses.

## [0.1.0] — 2025-07-11

### Added
- Phase 1 MVP: camera capture and mock AI sign analysis.

[Unreleased]: https://github.com/Skolaaa/park-sense-app/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/Skolaaa/park-sense-app/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Skolaaa/park-sense-app/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Skolaaa/park-sense-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Skolaaa/park-sense-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Skolaaa/park-sense-app/releases/tag/v0.1.0

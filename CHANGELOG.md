# Changelog

All notable changes to ParkSense are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the app is pre-1.0, the minor version carries user-facing change and the
patch version carries fixes; nothing here is treated as a stable public API yet.

## [Unreleased]

### Added
- ParkSense can be added to your home screen and works as an app: it opens
  full screen, loads offline, and tells you when a new version is ready.
- Parking reminders that reach you with the app closed. Once installed, the
  15-minute warning and the expiry arrive as push notifications from the
  server, so the phone can be in a pocket. In a plain browser tab the
  warning still fires while the tab is open.
- Recent scans. The last twenty results are kept on the device with a small
  thumbnail, listed on the home screen, and can be reopened. Reopened results
  say when they were checked and do not offer a timer.
- A Settings screen: reminders, community data, install, early access,
  privacy and terms, version, and a single button that clears everything on
  the device.
- Share a result as a sentence, through the phone's share sheet or the
  clipboard.
- Early access: leave an email in the app and everything ParkSense adds later
  stays free on that device.
- A short vibration with the verdict, so a yes or a no can be felt without
  looking at the screen.
- ParkSense now knows what day it is. On a NSW public holiday, a sign that
  lists particular days (such as "Mon–Fri") is treated as not applying, which
  is what Road Rules 2014 reg 318 says, and the result explains why. "School
  Days" restrictions are only applied on school days, using the NSW term
  dates. Every other app in this category answers from the photo alone.
- A twelve-hour strip on every result showing when you can and cannot park
  from now, and a "leave by" time that takes into account both the posted
  limit and the next restriction. "No parking right now" results say when
  parking opens.
- Stacked signs are read plate by plate and combined with the right
  precedence: No Stopping beats a clearway, which beats a time limit. If a
  plate cannot be classified the app says so and asks you to check, instead
  of quietly guessing.
- Community data, off by default. If you opt in, the app shares when and
  where you scan and park, rounded to the street and with no photo, and
  shows you what other drivers found on the same street: the usual limit,
  how often the verdict was "no", and when people actually park there. With
  enough data it shows activity by hour of day, labelled as what it is.
- After a parking timer ends, the app asks whether you got a fine. The answer
  is anonymous and is the only real measure of whether the readings are right.
- "Report a wrong reading" on every result.
- Privacy and Terms, written in plain language and reachable from the home
  screen. The result screen now carries a short reminder to check the sign
  yourself.
- A daily scan limit per device, so one install cannot run up an unbounded
  bill. It resets at midnight Sydney time and the app tells you when you hit it.
- Proper PNG app icons (including a maskable icon for Android) and a real
  social preview image, so installing the app and sharing a link both look
  right.

### Changed
- The app no longer asks the model whether you can park. The model only
  transcribes the sign; the decision is made in code from the calendar, the
  arrows and the plate precedence. Same photo, more consistent answer.
- The demo-mode sample result now matches how a 2P sign actually works: you
  can park during its hours, for two hours.

### Fixed
- Fine amounts were wrong. A No Parking offence was quoted at ~$344 when it
  is about $140, and a time-limit fine at ~$133 when it is about $140. Every
  amount now comes from a dated schedule that flags itself for review after
  the next NSW indexation.
- The 15-minute warning notification pointed at an icon file that did not
  exist.
- The README documented a client-side API key that the app stopped using
  months ago.

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
- Redesigned every screen again, this time as a clean, light interface built
  from a small set of reusable components (button, card, badge, alert,
  progress). The verdict is a single green or red card, the sign details sit
  in a plain list beneath it, and every action is a full-width button pinned
  to the bottom of the screen. Follows your phone's light or dark setting.
- The parking timer is a circular ring with the countdown inside and the
  start, reminder and expiry times listed as clock times beneath it.
- The camera shows corner brackets to line the sign up in, a standard round
  shutter, and tips that fade out on their own.
- The photo check now shows the whole photo uncropped, so a sign cut off at an
  edge is visible before it is sent.
- While a timer runs, the results screen shows one floating timer bar instead
  of a timer button and a bar that said the same thing.
- The "notifications are off" notice dismisses itself after a few seconds and
  no longer blocks the controls underneath it.
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
- Tapping the shutter before the camera delivered its first frame captured a
  blank image that later failed as an unreadable photo. The tap is now ignored
  until there is a frame to capture.
- Screens sat flush against the top edge on desktop because the safe-area
  padding overrode the normal top padding.
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

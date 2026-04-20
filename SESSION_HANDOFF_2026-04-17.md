# Session Handoff: Behavioral Experiment Platform

Date: 2026-04-17  
Workspace: `C:\Users\Schley\Erasmus Universiteit Rotterdam Dropbox\Dan Schley\Non-shared Research files\Ongoing\JustDan\ProportionCalibration\Online Tool`

## Purpose of this handoff

This document is a thorough summary of the work completed in this session so another Codex agent can continue without needing to reconstruct the history from scratch. It includes:

- project goals and architecture
- implementation status
- major bugs found and fixed
- GitHub Pages hosting/debugging history
- Qualtrics integration history
- current file layout and key files
- current known issues / likely next steps

## High-level project goal

Build a standalone browser-based behavioral experiment platform that can run:

- numerosity estimation tasks
- proportion judgment tasks

The platform should:

- run standalone in a browser
- also embed cleanly inside Qualtrics
- support multiple task variants via config / assignment
- export detailed trial-level data
- hand data back to Qualtrics as serialized JSON

## Core implemented task families

### 1. Numerosity task

Implemented as a 2 x 2 design:

- `separate_brief`
- `separate_visible`
- `joint_brief`
- `joint_visible`

Behavioral logic implemented:

- separate vs joint evaluation
- brief removed vs persistent visible presentation
- four-array trial-set structure for numerosity
- one row per array judgment in logged data

### 2. Proportion task

Implemented with:

- `joint`
- `separate`

Current proportion implementation is estimate-mode focused, with open-ended numeric percentage entry.

Behavioral logic implemented:

- `proportion_joint_evaluation`
- `proportion_separate_evaluation`

Joint proportion:

- full segmented bar with A-E blocks
- participants enter percentages for all five blocks
- total must approximately equal 100

Separate proportion:

- only target proportion shown as fraction of total bar
- participants enter one open-ended percentage

## Architecture summary

Main runtime is in:

- `app.js`

Shared components in the single-file runtime include:

- config loading / validation
- Qualtrics adapter
- logger
- screen manager
- numerosity renderer
- proportion renderer
- response manager
- numerosity stimulus generator
- proportion trial factory
- experiment controller

Configs are in:

- `configs/`

Qualtrics starter snippet is in:

- `qualtrics/qualtrics-snippet.js`

Docs are in:

- `README.md`
- `Behavioral Experiment Platform Instructions.docx`
- `Qualtrics Task Setup Guide.docx`

## Key files currently present

Important repo files/folders confirmed in this session:

- `app.js`
- `styles.css`
- `index.html`
- `README.md`
- `configs/`
- `qualtrics/`
- `trials/`
- `Behavioral Experiment Platform Instructions.docx`
- `Qualtrics Task Setup Guide.docx`

Important configs added earlier:

- `configs/sample-combined.json`
- `configs/numerosity-only.json`
- `configs/proportion-only.json`
- `configs/numerosity-separate-brief.json`
- `configs/numerosity-separate-visible.json`
- `configs/numerosity-joint-brief.json`
- `configs/numerosity-joint-visible.json`
- `configs/proportion-joint-only.json`
- `configs/proportion-separate-only.json`

## Major implementation and bug-fix history

### Early runtime bug fixed

The numerosity/proportion response panels had a bug caused by accidental use of:

- `panel.appendChild(prompt)`

This was picking up the global browser `window.prompt` function instead of a DOM node, which caused:

- `Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.`

This was fixed by removing the broken `appendChild(prompt)` calls from the relevant response builders.

### Visual redesign work completed

The UI was moved away from the original black-background look. The user explicitly requested:

- white overall page background
- larger visuals
- larger fonts
- colorblind-friendly palette

Changes made:

- white background across the app
- enlarged task visuals and typography
- proportion task uses colorblind-friendly palette
- numerosity visuals enlarged
- proportion task redesigned to match reference screenshots more closely

### Proportion task changes completed

User requested:

- open-ended percentage entry rather than slider
- joint format to resemble a labeled segmented bar with open response fields
- separate format to resemble a single-shaded proportion bar

Changes implemented:

- joint proportion now collects open-ended numeric percentages for A-E
- separate proportion collects a single open-ended numeric percentage
- joint proportion logs one row per block A-E
- live total display included in joint proportion

### Label overlap work

User observed overlap in proportion labels. This was addressed by:

- changing joint proportion label placement to evenly spaced anchor slots across the bar

This reduced the tendency for connector labels to collide when segments are small or oddly arranged.

### Numerosity label protection

User noted that numerosity labels could be partly covered by dots. This was addressed by:

- reserving label space in the numerosity generator / region layout
- using `labelReservedTop` in joint layouts

### Font/UI size increase

User repeatedly noted that the UI was too small. Several rounds of scaling changes were made in `styles.css`.

### Recent Qualtrics-specific layout improvements

Latest session changes:

- suppress participant-ID entry inside Qualtrics
- auto-use Qualtrics session/response identifier when no explicit participant ID is passed
- add Qualtrics-specific top-aligned layout mode
- reduce vertical centering behavior that made instructions appear far down the page
- reduce task footprint inside Qualtrics so the proportion task fits better in the browser frame

These latest changes were applied to:

- `app.js`
- `styles.css`

## GitHub / hosting history

### Initial GitHub setup confusion

There was substantial time spent untangling a repo/folder mix-up.

What happened:

- a nested wrong folder/repo was created:
  - `...\Online Tool\Online Number Perception Measurement Tool\`
- GitHub Desktop was initially attached to that wrong nested folder
- that wrong repo only contained:
  - `.git`
  - `.gitattributes`

This caused:

- GitHub repo appearing empty
- GitHub Pages showing 404

Eventually this was diagnosed by checking the actual folder contents in Explorer and confirming the correct working folder is:

- `...\Online Tool`

The correct folder contained:

- `app.js`
- `index.html`
- `styles.css`
- `configs`
- etc.

### GitHub auth issues

User initially attempted `git push` from PowerShell using normal GitHub password. That failed because:

- GitHub no longer accepts standard password authentication for git push over HTTPS

We discussed PAT vs GitHub Desktop auth. User then moved to GitHub Desktop-based publishing.

### Repo recreation

Because the remote contained a bad initial commit history and GitHub Desktop was complaining about newer commits on remote, user ultimately:

- deleted and recreated the GitHub repo
- deleted and recreated the local desktop-linked repo entry

This gave a clean publish path.

### GitHub Pages status

Repo is hosted at:

- `https://danrschley.github.io/Online-Number-Perception-Measurement-Tool/`

However, caching / stale asset issues appeared during Qualtrics integration. The current workaround is to use jsDelivr URLs with cache-busting query strings for script and stylesheet loading from Qualtrics.

## Qualtrics integration history

### Goal

User wanted:

- no per-task JavaScript editing in Qualtrics
- task selected entirely via Survey Flow embedded data
- no local CSV download prompt inside Qualtrics
- Qualtrics to store task output via embedded data

### Desired task selection model

The user explicitly wanted something like:

- `task = "proportion_joint_evaluation"`

in Survey Flow, with no JS changes required when switching tasks.

### Code changes implemented for this

The runtime was updated to support a `task` embedded-data key and a task-to-config map. The intended mapping is:

- `combined_session`
- `numerosity_only`
- `numerosity_separate_brief`
- `numerosity_separate_visible`
- `numerosity_joint_brief`
- `numerosity_joint_visible`
- `proportion_only`
- `proportion_joint_evaluation`
- `proportion_separate_evaluation`

### Important Qualtrics adapter behavior

The app writes back:

- `experiment_data_json`
- `experiment_metadata_json`
- `experiment_complete`

This is intentional because Qualtrics stores one row per respondent, not one row per trial.

### Local-download suppression

User reported the app still tried to download CSV/JSON at the end inside Qualtrics. The runtime was updated so that:

- auto-download remains on for standalone/local mode
- auto-download is suppressed when Qualtrics runtime is detected

### Participant ID behavior

User explicitly said:

- do not ask participants to enter a participant ID
- let Qualtrics keep track of IDs

Current implemented behavior:

- if running in Qualtrics and no explicit `participant_id` is provided, the app now falls back to the Qualtrics session/response identifier
- the participant setup screen is skipped inside Qualtrics

### Question HTML and JS guidance

The intended Qualtrics question HTML is:

```html
<div id="behavioral-experiment-root"></div>
```

There was a point where the question HTML still contained:

```html
Instructions <div id="behavioral-experiment-root"></div>
```

This was identified as undesirable and the user was instructed to use only the container div.

### Qualtrics JS snippet history

The Qualtrics question JavaScript evolved to:

- hide the Next button at load
- populate `window.__BEHAVIORAL_EXPERIMENT_ASSIGNMENTS`
- pass:
  - `participantId`
  - `sessionId`
  - `condition`
  - `counterbalancingAssignment`
  - `task`
- load CSS and JS dynamically
- start the experiment with `mountEl: "#behavioral-experiment-root"`
- save results to Qualtrics embedded data on `behavioral-experiment:complete`
- show the Next button after completion

### Stale hosted-script problem

This became the key integration issue late in the session.

Symptoms:

- Qualtrics console showed config load errors like:
  - `Could not load config from ./configs/sample-combined.json`
  - `Could not load config from ./configs/proportion-joint-only.json`

Interpretation:

- the loaded `app.js` was still using relative config paths like `./configs/...`
- inside Qualtrics, relative paths resolve against the Qualtrics URL, not the hosted GitHub site

We added a fix locally to `app.js` to introduce:

- `HOSTED_BASE_URL`
- `hostedPath(...)`

and to make the task map use absolute hosted config URLs.

However, when the user opened the browser copy of `app.js`, it still showed the older code without:

- `HOSTED_BASE_URL`
- `hostedPath(...)`

This indicated the hosted script being fetched by Qualtrics was stale or cached.

### jsDelivr workaround

To bypass stale GitHub Pages asset caching, the user was advised to change the Qualtrics question JS to load:

- script from jsDelivr
- stylesheet from jsDelivr
- with cache-busting query strings like `?v=20260417c`

The intended temporary URLs are:

- `https://cdn.jsdelivr.net/gh/DanRSchley/Online-Number-Perception-Measurement-Tool@main/app.js?v=20260417c`
- `https://cdn.jsdelivr.net/gh/DanRSchley/Online-Number-Perception-Measurement-Tool@main/styles.css?v=20260417c`

At the end of the session, the user reported adding the temporary JS updates.

## Local vs hosted code mismatch: important state

This is crucial for the next agent.

### Local `app.js`

I verified locally with PowerShell that the local `app.js` contains:

- `HOSTED_BASE_URL`
- `hostedPath(...)`
- absolute `TASK_CONFIG_MAP`
- absolute fallback config via `hostedPath("configs/sample-combined.json")`

### Browser-opened `app.js`

The user pasted the browser-served `app.js` and it was still the old version:

- no `HOSTED_BASE_URL`
- no `hostedPath(...)`
- `TASK_CONFIG_MAP` still used relative `./configs/...` values

This means:

- local code and remotely served code were out of sync
- or the remotely served file was aggressively cached

The jsDelivr approach was introduced to bypass this.

## Current code changes made in this final part of the session

### `app.js`

Most recent changes applied:

1. Add `this.isQualtricsRuntime = this.config.qualtrics.enabled && this.qualtricsAdapter.isAvailable();`
2. Add mount root classes:
   - `behavioral-experiment-root`
   - `qualtrics-embed` when inside Qualtrics
3. In `run()`:
   - if Qualtrics runtime and no `participantId`, use `sessionId` instead of prompting
   - only show participant setup screen outside Qualtrics when participant ID is missing

### `styles.css`

Most recent changes applied:

1. Add `.behavioral-experiment-root`
2. Add `.qualtrics-embed` layout mode
3. In Qualtrics mode:
   - top-align screens instead of vertically centering
   - reduce padding
   - reduce panel size
   - reduce headline sizes
   - reduce bar/task footprint
   - reduce percentage-grid widths
   - make proportion task fit better inside Qualtrics viewport

### `README.md`

Updated with Qualtrics-specific notes:

- no participant-ID prompt in Qualtrics
- use only the root container div in question HTML
- use cache-busting suffix when stale script appears

### Word docs

Existing file:

- `Behavioral Experiment Platform Instructions.docx`

This file appears to have been locked/open and could not be overwritten during this session.

New file created instead:

- `Qualtrics Task Setup Guide.docx`

This new file contains:

- Qualtrics setup steps
- embedded-data fields
- supported task keys
- final Qualtrics JS snippet using jsDelivr URLs
- note that participant ID prompt is suppressed in Qualtrics
- note about serialized JSON storage
- local PowerShell commands for future updates

## Recommended Qualtrics settings as of end of session

### Survey Flow fields

Expected embedded-data fields:

- `participant_id`
- `task`
- `task_condition`
- `counterbalance_assignment`
- `experiment_data_json`
- `experiment_metadata_json`
- `experiment_complete`

Typical use:

- set `task = proportion_joint_evaluation`
- leave `task_condition` blank unless needed for numerosity logic

### Supported `task` values

- `proportion_joint_evaluation`
- `proportion_separate_evaluation`
- `numerosity_separate_brief`
- `numerosity_separate_visible`
- `numerosity_joint_brief`
- `numerosity_joint_visible`
- `proportion_only`
- `numerosity_only`
- `combined_session`

### Current recommended question JavaScript

Use the version in:

- `qualtrics/qualtrics-snippet.js`

and, if stale hosted assets remain a problem, use jsDelivr URLs with cache-busting query strings.

## User-facing requirements explicitly stated in this session

The user clearly requested the following:

1. No participant ID prompt inside Qualtrics.
2. Qualtrics should track participants using its own ID/session system.
3. Task selection should happen entirely through Survey Flow, not by editing JS.
4. Instructions panel should not appear far down the page.
5. Main task should fit inside the browser page more cleanly.
6. A document in the project folder should explain how to change Qualtrics task settings.
7. Anything requiring PowerShell should be given as copy-paste commands in documentation.

These requirements should be preserved.

## What still may need verification

These are the most important open validation steps for the next agent.

### 1. Confirm Qualtrics now skips participant setup

After the latest `app.js` and `styles.css` are pushed and served correctly:

- participant setup panel should no longer appear in Qualtrics

### 2. Confirm Qualtrics layout improvement

Check that:

- instructions panel starts near top of question
- proportion bar task fits in frame without forcing major scrolling

### 3. Confirm runtime loads updated script

This remains the main integration risk.

Need to verify that Qualtrics actually loads either:

- the updated GitHub Pages script with absolute config URLs
- or the jsDelivr copy with cache-busting suffix

The next agent should inspect:

- browser console
- browser network panel
- actual served contents of `app.js`

### 4. Confirm config resolution inside Qualtrics

Need to verify that when:

- `task = proportion_joint_evaluation`

the runtime fetches:

- `https://danrschley.github.io/Online-Number-Perception-Measurement-Tool/configs/proportion-joint-only.json`

or the equivalent absolute hosted config URL

not:

- `./configs/proportion-joint-only.json`

from a Qualtrics `/jfe/...` page path

### 5. Confirm result handoff

Need to verify after task completion:

- no local download prompt
- `experiment_data_json` populated
- `experiment_metadata_json` populated
- `experiment_complete = 1`

## Useful diagnostics already collected in this session

### Console errors seen

Examples observed:

- `Failed to load resource: the server responded with a status of 404 ()`
- `Could not load config from ./configs/sample-combined.json`
- `Could not load config from ./configs/proportion-joint-only.json`

These were central in diagnosing stale/relative config-path issues.

### Network observations

At one point:

- `styles.css` was loading as 200
- but config fetches were failing

This indicated partial asset loading but bad config path resolution.

## Documentation state at end of session

### Updated / relevant docs

- `README.md` updated
- `Qualtrics Task Setup Guide.docx` newly created

### Locked file note

Could not overwrite:

- `Behavioral Experiment Platform Instructions.docx`

because Word or another program appeared to have it open. The next agent can:

- close the document if open
- optionally merge the new Qualtrics guide content back into that original file if desired

## Suggested next steps for the next Codex agent

1. Verify local vs remote `app.js` content again.
2. Confirm whether Qualtrics is currently loading GitHub Pages `app.js` or jsDelivr `app.js`.
3. If stale asset issues persist, keep jsDelivr URLs in the Qualtrics question JS until stable.
4. Push latest:
   - `app.js`
   - `styles.css`
   - `README.md`
   - `Qualtrics Task Setup Guide.docx`
5. Retest in Qualtrics:
   - participant setup should not appear
   - instructions should be near top
   - proportion task should fit much better
   - data should save without local download prompt
6. Optionally refine numerosity layout for Qualtrics if it still feels oversized.

## If another agent needs to know the immediate likely root cause of any remaining issue

The most likely remaining issue is still one of:

- stale cached hosted `app.js`
- Qualtrics preview caching
- script source still pointing at old GitHub Pages asset instead of cache-busted jsDelivr

Not likely root causes anymore:

- Survey Flow task key naming
- missing `task` embedded data
- local code missing the feature

Those parts were already corrected.


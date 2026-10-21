# ClipForge AI — MVP

A free, static browser app that ranks promising short-form clip moments from timestamped transcripts and drafts hooks, titles, and captions.

## Features
- Parses timestamped transcript lines (`[00:12] text`, `00:12 - text`, or `00:01:12 text`)
- Ranks candidate segments with a transparent, rule-based heuristic
- Suggests a hook, title, and platform-specific caption
- Copies suggestions and exports JSON
- No API key, account, backend, or build step required
- Transcript analysis runs locally in the browser

## Deploy free with GitHub Pages
1. Create a GitHub repository named `clipforge-ai`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/(root)`, then save.
6. Wait for GitHub Pages to publish. The URL will usually be `https://YOUR-USERNAME.github.io/clipforge-ai/`.

## Limitations
This MVP does not download YouTube videos, transcribe audio, or render/crop video files. Scores are heuristic indicators only and do not predict views or virality. Review the original video and make sure you have rights to use it before publishing.

## Next milestones
1. Add editable clip ranges and export an edit decision list (EDL).
2. Add browser-side subtitle styling and rendering if device limits allow.
3. Explore free/open-source speech-to-text options, considering compute and mobile constraints.

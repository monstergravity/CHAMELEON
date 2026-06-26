<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/88925954-c1cc-43c0-a655-3edc8b8c135e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Multiplayer follow-up

Online multiplayer is intentionally out of scope for the current single-player restoration update.
The recommended next version is a server-authoritative room model that synchronizes player positions,
per-player restoration progress, restoration patches, guard state, and elimination events. A trapped
opponent should be eliminated only after the server determines they have no path to an exit or safe
area for a short continuous grace period.

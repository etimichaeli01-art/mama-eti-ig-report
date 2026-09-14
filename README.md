# mama-eti-ig-report (PUBLIC — data only, no secrets committed)

Fetches raw Instagram stats for **@mama_eti__deals** (mama_eti_deals, B2C) and commits them here
as `latest_data.json`. This is the data half of the weekly measurement loop; the analysis
(comparing against baseline/goals) and the actual Gmail draft are still done by the claude.ai
routine `mama_eti — מדידה שבועית מהאינסטגרם` (trig_01JnKCjugVmUTwDuPLsdfC97) — that part stayed
a real Claude judgment call on purpose, not a canned script sentence.

## Why this exists
That routine's own sandbox environment (`env_01C23gxc4TtNHJTe78YhPLTT`) cannot reach
`graph.instagram.com` — confirmed via its own diagnostic curl on 2026-09-13
("403 connect_rejected — organization policy"). The same environment's egress policy does
allow github.com-family hosts, so the routine reads `latest_data.json` from here
(`raw.githubusercontent.com`) instead of hitting Instagram directly. Same fix pattern already
proven working for Eti Virtual Office's posting automation (see the sibling private repo
`eti-ig-automation`) — this is the B2C counterpart, kept in a separate repo on purpose (never
mix the two businesses' automation or credentials).

## Files
- `fetch_report_data.mjs` — pulls `/me`, `/me/media`, and per-post `/insights` for the last 8
  days, writes `latest_data.json`, commits and pushes. Credentials come from repo secrets
  `MAMA_ETI_USER_ID` / `MAMA_ETI_ACCESS_TOKEN` (never committed) — this repo is **public** so
  the routine can read `latest_data.json` back via a plain, unauthenticated
  `raw.githubusercontent.com` URL; a private repo's raw URLs 404 without a token, which is
  exactly what broke the first version of this fix on its first live test.
- `.github/workflows/fetch.yml` — runs the script every Sunday 03:40 UTC, 20 minutes before the
  claude.ai routine's own 04:00 UTC fire, so the data is never stale when it's read.

## Rotating the token
If `~/.instagram-api/mama_eti.json`'s token is rotated locally, update it here too:
`gh secret set MAMA_ETI_ACCESS_TOKEN --repo etimichaeli01-art/mama-eti-ig-report`

## If the routine reports a fetch error
Check the latest Actions run in this repo first (`gh run list`) — if THAT failed, the problem
is upstream of the routine (token expired, Instagram API change) and re-pointing the routine
won't help. If the Action succeeded but the routine still can't read `latest_data.json`, then
even `raw.githubusercontent.com` got blocked and the underlying network-policy question needs
revisiting from scratch.

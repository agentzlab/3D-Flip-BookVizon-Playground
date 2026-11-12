# 3D Flip BookVizon — GPT Playground

**This repo is a PLAYGROUND. It is NOT the shipping app.**

- **Shipping app:** `MyDigitalStudioz/3D-Flip-BookVizon` — live at https://mydigitalstudioz.github.io/3D-Flip-BookVizon/
- **Tenant:** ChatGPT / Astra (GPT) — experiments, dig-arounds, suggestions, alternate versions of the app.
- **Why it exists:** Jon wants his ChatGPT subscription doing useful work on this app without any chance of interfering with the shipping line. This repo is that safe place.
- **Harvest:** Trinity diffs this repo against the shipping line, reports findings to Jon, and anything worth keeping graduates ONLY through Jon's call → the Penguin Lab → the full port gates on the shipping repo. **Nothing in this repo ever ships directly.**

## Rules of the playground

1. `main` holds a **pristine snapshot** of the shipping build — one commit per snapshot, labeled with the source version and source commit. Never rewrite, rebase, or force-push a snapshot commit; it is the comparison anchor.
2. Do experiments on **branches off main** (suggested: `astra/<idea>`) or in commits clearly labeled EXPERIMENT.
3. Leave a short note per experiment (a NOTES file or a section in your branch's README): what you tried, what you found, what you recommend. A change without a note is hard to harvest.
4. **Snapshot discipline:** when a round ends, Trinity harvests and the next round starts from a FRESH snapshot of the then-current shipping build. Long-lived drift is the enemy — don't build a fork we can't compare.
5. The app is a single-file build (`index.html`, ~13.6 MB) plus its asset tree (`images/`, `shelf/`, `media/`, `vendor/`, `scripts/`). The book content (Harlow, Santa, and the shelf books) is finished, published work — experiments target the VIEWER (performance, interaction, features, code quality), not the books' content, unless a note says otherwise.

## Snapshot log

- **v13.57** — snapshotted 2026-11-11 from `MyDigitalStudioz/3D-Flip-BookVizon` @ `1a29eec6` (the snapshot is this commit's tree, plus this charter file).

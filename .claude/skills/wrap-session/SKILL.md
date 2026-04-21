---
name: wrap-session
description: Summarize the current CareLinkAI development session, update ChrisOS technical state files, and append a session log entry. Run at the end of every dev session.
---

# Wrap Session

At the end of every dev session, complete these steps in order:

## Step 1 - Write session summary
Append a new entry to:
C:\Users\profy\OneDrive\Documents\Claude\Projects\ChrisOS\05_Agent_Logs\DEV_SESSION_SUMMARIES.md

Use this format (newest at top):

### YYYY-MM-DD - Session Title
- Objective:
- Work completed:
- Files changed:
- Commands run:
- Tests/build status:
- Deployment impact:
- New risks/blockers:
- Recommended next step:

Be specific. This summary will be read by a future Claude Code session and by CoWork. Vague summaries are useless.

## Step 2 - Update technical state
Update:
C:\Users\profy\OneDrive\Documents\Claude\Projects\ChrisOS\02_Memory\CARELINKAI_TECHNICAL_STATE.md

Update only the sections that changed:
- Current Status (branch, last stable build date, last reviewed date)
- Architecture Overview (if stack changed)
- Known Technical Issues (add new, remove resolved)
- Recent Technical Decisions (add any decisions made this session)
- Current Priorities (reorder based on what is done and what is next)
- Recommended Next Step

## Step 3 - Update open loops
Update:
C:\Users\profy\OneDrive\Documents\Claude\Projects\ChrisOS\03_Execution\CARELINKAI_TECH_OPEN_LOOPS.md

- Check off completed items
- Add new loops discovered this session
- Move resolved items to the Closed Loops section at the bottom

## Done
Confirm to the user: "Session wrapped. ChrisOS state files updated."

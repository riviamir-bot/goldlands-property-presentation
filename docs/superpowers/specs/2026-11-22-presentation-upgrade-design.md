# GOLDLANDS presentation system upgrade: design (summary)

The approved design lives in the Claude doc "אפיון: שדרוג מערכת המצגות של GOLDLANDS"
(https://claude.ai/artifact/SMVh3oCVYQHBERCiQsugVi). This file is the short English summary plans argue from.

**Why:** marketers present projects to prospective buyers. What is on screen must be correct at that moment
(no sold apartment shown as available, no stale price) and free of anything internal or administrative.

**Chosen approach (A, live connection):** the presentation reads projects, renders, apartments, prices and
marketer assignments from the marketing dashboard database, read-only, through a server layer. Only content
unique to the presentation (marketing copy, technical spec, location, apartment plans, 3D) is stored by the
presentation itself, keyed by the marketing project id.

**Goals**
- The real projects appear with their renders, apartments and prices from the marketing system.
- An update in the marketing system shows in the presentation with no extra step.
- Each marketer signs in with their marketing-system user and sees only assigned projects; managers see all.
- Full-screen presentation mode for tablet and large screen, with no editing controls.
- A ready slot per project for an interactive 3D view (GLB upload or external embed); tab hidden when empty.

**Non-goals:** creating 3D models; any change to the marketing system; leads, campaigns, budgets.

**Anti-goals:** stale price or availability in front of a client; internal data (leads, budgets, notes) on a
client-facing screen; the same value maintained in two systems.

**Decided display rules:** prices shown by default with a quick hide toggle; sold apartments shown greyed
with no price; `negotiation` shown as "שמורה"; a tab with no content is not shown; demo mode and the six
fictional projects are removed.

**Phases:** 1 cleanup, 2 live connection + sign-in, 3 presentation mode + design, 4 3D tab, 5 content.

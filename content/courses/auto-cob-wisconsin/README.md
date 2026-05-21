# Auto COB Course — Wisconsin Pilot

A structured curriculum for learning how to coordinate benefits in the Wisconsin-pilot Auto COB context. Built on the 12-module spine in `./COB_Flow_Auto_COB_Syllabus.docx`.

## Where this lives

This course is build-driving content for the COB Flow Content Manager (planned Phase I / post-pass-1). It lives in cob-flow-app — same repo as the application that will eventually serve it — because:

- The Content Manager will be built here; ingestion script and source content stay co-located
- Course content is actively edited; lives alongside the active build, not the planning repo
- End-state is Postgres tables here; no porting later

External reference material (ForwardHealth PDFs, Wisconsin regulation, handbooks, case-law scans) stays in cob-auto-claim under `reference/`. Course markdown references those by cross-repo relative paths assuming sibling-repo layout under `~/Documents/Claude/Projects/`.

## Audience

This course is authored once and serves three tiers, distinguished by inline markers in each file.

| Tier | Audience | Scope |
|---|---|---|
| **Customer** | Customer-side staff learning the COB Flow program at orientation depth | Roughly 4–6 chapters of orientation depth |
| **Analyst** | Future COB Flow Analyst hires; operational depth | All 12 chapters, with prototype tie-ins and operational practice |
| **Self** | SME deep dives; extension reading, case-law citation, edge cases | All 12 chapters plus extension material |

Tier markers in content files use this convention:

- Default content (no marker) = all three tiers (Customer / Analyst / Self)
- `> **Analyst track and deeper:**` = Analyst + Self only
- `> **Self track only:**` = SME deep dive

## Structure

The course mirrors the eventual Content Manager schema (Course → Chapter → Lesson → Quiz) so it can be ingested into the platform without rework when that feature ships.

| Spec term | Course element |
|---|---|
| Course | This entire directory (one course: Auto COB Wisconsin) |
| Chapter | Each `chapter-NN-name/` directory (12 chapters total, mirroring Syllabus modules) |
| Lesson | Each `lesson-N-*.md` within a chapter |
| Quiz (Chapter-level) | `quiz.md` within a chapter (MC self-check) |
| Quiz (Course-level) | Files in `course-quizzes/` (end-of-pair scenarios + capstone scenario) |

## Chapter index

| # | Chapter | Status |
|---|---|---|
| 1 | Foundations — why Auto COB exists | 🚧 **Pilot (in progress)** |
| 2 | Auto insurance — crash course for health-side learners | ⏳ Planned |
| 3 | COB fundamentals — the NAIC framework | ⏳ Planned |
| 4 | Where health and auto meet — the intersection | ⏳ Planned |
| 5 | State law overlay — no-fault, tort, made-whole, common-fund, comparative negligence | ⏳ Planned |
| 6 | ERISA — the game-changer | ⏳ Planned |
| 7 | Medicare, Medicaid, and other government coverages | ⏳ Planned |
| 8 | Personal injury attorneys — the workflow counterparty | ⏳ Planned |
| 9 | The recovery workflow end-to-end | ⏳ Planned |
| 10 | Documents and data — what crosses the analyst's desk | ⏳ Planned |
| 11 | Compliance, authority, and audit | ⏳ Planned |
| 12 | Continuing development — where the field is going | ⏳ Planned |

Total estimated study time: 40–55 hours across all 12 chapters (per Syllabus).

## How to use this course

- Start at Chapter 1. Each chapter has four pieces: a reading guide pointing into source materials, an authored summary, a worked example, and a quiz.
- Customer-track learners read content that's unmarked and skip Analyst/Self sections. Quizzes filter to Customer-tagged questions.
- Analyst-track learners read everything except `> **Self track only:**` sections.
- Self-track learners read everything.
- After every pair of chapters, take the pair scenario in `course-quizzes/` (when published).
- After Chapter 12, take the capstone scenario.

## Source materials

The course extends and synthesizes the following materials.

In this repo (cob-flow-app):

- `./COB_Flow_Auto_COB_Syllabus.docx` — the spine and canonical outline
- `../../../docs/COB_Flow_Product_Spec_v0.8.docx` — referenced for project framing in Chapter 1 and engine rules throughout
- `../../../docs/COB_Flow_Handoff.md` — project background and working norms
- `../../../docs/COB_Flow_NextJS_Conversion_Handoff.md` — architectural framing
- `../../../docs/COB_Flow_WI_Workflow_v1.0.docx` — the 9-phase operational workflow (Chapter 9)
- `../../../docs/COB_Flow_MVP.html` — authoritative UI reference; sample claims c001–c010 are the worked-example pool

In cob-auto-claim (external reference material):

- `../../../../cob-auto-claim/reference/training/ForwardHealth_COB_Training_final.pdf` — Wisconsin Medicaid official training (33 pages)
- `../../../../cob-auto-claim/reference/training/ForwardHealth_all_coord_policy.pdf` — comprehensive policy reference (44 pages)
- `../../../../cob-auto-claim/reference/training/forwardhealth-cob-catalog.md` — index of additional ForwardHealth modules
- `../../../../cob-auto-claim/reference/regulations/Wisconsin Legislature_ Ins 3.40(11)(a).pdf` — Wisconsin's primary COB regulation
- `../../../../cob-auto-claim/reference/handbooks/COB-TPL-Handbook.pdf` — Medicare COB/TPL handbook
- `../../../../cob-auto-claim/reference/handbooks/cob-smart-webinar-CBC-final-072116.pdf` — industry COB overview
- `../../../../cob-auto-claim/reference/case-law/` — subrogation textbook scans (IMG_1366–1371)
- `../../../../cob-auto-claim/strategy/COB_Health_Insurance_Courses_Research.pdf` — landscape research

Cross-repo paths assume cob-flow-app and cob-auto-claim are sibling directories under the same parent (the standard local-development layout under `~/Documents/Claude/Projects/`).

## Future: Content Manager ingestion

This directory is structured to be ingested into the COB Flow Content Manager (planned Phase I). When the Content Manager exists:

- The directory becomes one **Course** record
- Each `chapter-NN-name/` directory becomes one **Chapter** record (with `module_order` from the directory prefix)
- Each `lesson-N-*.md` becomes one **Lesson** record with Slides[] derived from H2/H3 sections
- Each `quiz.md` becomes one Chapter-level **Quiz** record with Questions[] parsed from the MC blocks
- Files in `course-quizzes/` become Course-level **Quiz** records
- Tier markers map to per-Question `tier` fields

Authoring conventions in `conventions.md` describe the exact format the ingestion script expects.

## Status

- Active focus: Chapter 1 (Foundations) pilot — validating the format end-to-end before scaling to Chapters 2–12.

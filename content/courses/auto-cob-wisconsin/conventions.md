# Course Authoring Conventions

This document defines the conventions all course files follow. Both human authors and the future Content Manager ingestion script depend on these.

## File and directory naming

- Chapters: `chapter-NN-name/` where `NN` is two-digit zero-padded module order (01–12) and `name` is a short hyphenated slug derived from the Syllabus chapter title.
- Lessons: `lesson-N-name.md` where `N` is the lesson order within the chapter (1, 2, 3) and `name` describes the lesson type (`reading-guide`, `summary`, `worked-example`).
- Chapter overview: `chapter.md` — the entry point describing the chapter.
- Chapter quiz: `quiz.md` — MC self-check tied to the chapter's lessons.
- Answer key: `answer-key.md` — separate file so learners aren't tempted; mirrors `quiz.md` structure.

## Cross-repo path references

Course content lives in cob-flow-app; external reference materials (ForwardHealth PDFs, Wisconsin regulation, handbooks, case-law scans) live in cob-auto-claim. Course markdown references those externals via relative paths assuming both repos are siblings under a common parent (the standard `~/Documents/Claude/Projects/` layout).

If the repo layout changes, all cross-repo paths will need updating. The Content Manager ingestion script (Phase I) will resolve these paths at ingestion time and store URLs or blob refs in the database — at that point the relative-path assumption stops mattering for runtime; only authoring-time path resolution matters.

## Tier markers

Three audience tiers share the same source files. Markers identify content scope:

- **Default** (no marker) — content is for all three tiers (Customer, Analyst, Self)
- **Analyst track and deeper** — content is for Analyst and Self tiers only
- **Self track only** — content is SME-depth, for the Self track only

Marker syntax in markdown (indented code blocks shown below; both indented and fenced render identically):

    > **Analyst track and deeper:**
    > [content here]

    > **Self track only:**
    > [content here]

When a marker applies to an entire section, place it at the top of the section. When it applies to a single paragraph, place it immediately before that paragraph.

## MC question schema

Each multiple-choice question in `quiz.md` follows this exact structure:

    ### Q1

    **Tier:** Customer | Analyst | Self
    **Topic:** [short topic label]

    [Question stem in plain language. May span multiple paragraphs. Should not telegraph the answer.]

    a. [Option A]
    b. [Option B]
    c. [Option C]
    d. [Option D]

Answer key (`answer-key.md`) mirrors this with the answer revealed:

    ### Q1 — Answer: **c**

    **Rationale:** [Why c is correct, why the distractors are wrong. 1–3 sentences. This is the teaching that compounds the question.]
    **Source:** [Citation to the chapter section or external source where the concept is taught.]

Notes:

- Always exactly 4 options labeled `a` through `d` lowercase.
- The `Tier` field uses pipe-separated tier names from the lowest tier that should see this question through Self.
  - `Tier: Customer | Analyst | Self` — Customer track and up see this question
  - `Tier: Analyst | Self` — Analyst track and up
  - `Tier: Self` — Self only
- Question numbering is per-chapter (Q1, Q2, ...), not global.

## Scenario question schema

Course-level scenario quizzes in `course-quizzes/` follow a different schema (free-response, multi-prompt):

    ## Scenario: [short title]

    **Tier:** Customer | Analyst | Self
    **Covers:** Chapters N and M
    **Estimated time:** [X minutes]

    ### Facts

    [Plain-English fact pattern. Member name, accident, coverages, fault, medical bills, plan type. 150–300 words.]

    ### Prompts

    1. [First analytical question]
    2. [Second analytical question]
    3. [Third analytical question]

    ### Model answer walkthrough

    > **Note:** Read after attempting the prompts yourself.

    [1–2 page authored walkthrough showing the analytical move. Cites specific course chapter sections.]

## Citation style

When citing material:

- Internal (within the course): `[Chapter 6 § Plan Document Classification]`
- Syllabus: `[Syllabus Module 6]` (preserves lineage)
- cob-flow-app spec: `[Spec § 6.1 Rule 2]`
- Wisconsin regulation: `[Wis. Admin. Code § Ins 3.40(11)(a)]`
- Wisconsin statute: `[Wis. Stat. § 632.32]`
- Case law: `[Rimes v. State Farm, 106 Wis. 2d 263 (1982)]`
- ForwardHealth training: `[FH Master Deck slide 12]` or `[FH Policy Reference p. 18]`
- ForwardHealth Online Handbook: `[FH Handbook Topic #253 (Payer of Last Resort)]`
- CMS materials: `[CMS COB Workbook Module 5]`

## Schema-forward authoring

The Content Manager ingestion path expects:

- Slides derived from H2/H3 sections within each Lesson file
- Quiz Questions extracted by parsing the MC block schema above
- Tier metadata preserved per-question and per-section
- Chapter and Lesson order derived from directory and filename prefixes (`NN`, `N`)
- Citations preserved as-is (the platform will render them; authoring tool doesn't need to enrich them)

When in doubt, prefer structure that's easy to parse mechanically over prose elegance. Markdown sections, numbered lists, and explicit field labels beat narrative density for ingestion.

#!/usr/bin/env node
/**
 * Seed the Content Manager with the Auto COB Wisconsin demo curriculum.
 *
 * Idempotent: exits 0 if the learning path already exists (unless --reset).
 * --reset: deletes existing demo data then reseeds.
 *
 * Run:
 *   npx tsx scripts/seed-content-manager-demo.ts
 *   npx tsx scripts/seed-content-manager-demo.ts --reset
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import {
  courseSequences,
  courses,
  modules,
  lessons,
  quizzes,
  quizQuestions,
} from '../src/lib/db/schema/content.js';
import { platformAuthorityCeilings } from '../src/lib/db/schema/authority.js';

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

const AUTHOR_ID = '00000000-0000-0000-0000-000000000001'; // u_ad / A. Donnelly
const LP_SLUG   = 'auto-cob-coordinating-benefits';

const DEMO_COURSE_SLUGS = [
  'auto-cob-foundations',
  'auto-cob-payer-ordering',
  'auto-cob-wisconsin-regs',
  'auto-cob-recovery-workflows',
];

// ---------------------------------------------------------------------------
// slide helper
// ---------------------------------------------------------------------------

type TextSlide = { type: 'text'; order: number; heading?: string; body_markdown: string };
type Slide = TextSlide;

function slide(order: number, heading: string, body: string): Slide {
  return { type: 'text', order, heading, body_markdown: body };
}

// ---------------------------------------------------------------------------
// curriculum data
// ---------------------------------------------------------------------------

const curriculum = [
  // =========================================================================
  // Course 1 — Foundations of Auto COB
  // =========================================================================
  {
    course: {
      slug: 'auto-cob-foundations',
      title: 'Foundations of Auto COB',
      description: 'Why auto and health insurance overlap when someone is injured, and the cost of getting primacy wrong.',
      estimated_hours: 6,
      sequence_order: 1,
    },
    modules: [
      {
        slug: 'why-auto-cob-exists',
        title: 'Why Auto COB Exists',
        description: 'The multi-payer problem created by auto accidents and its financial consequences.',
        module_order: 1,
        lessons: [
          {
            slug: 'why-auto-cob-reading-guide',
            title: 'Reading Guide: Foundations',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'The vocabulary of COB', 'Read ForwardHealth Master Deck slides 1–7. These cover the COB definition, third-party liability (TPL), commercial health insurance, payer of last resort, and provider-based billing. Wisconsin Medicaid vocabulary maps closely to commercial COB terms.'),
              slide(2, 'The COB Flow project framing', 'Read Product Spec § 1 (project overview) and § 5 (operational workflow). Section 1 establishes why the product exists; Section 5 walks the operational workflow an analyst follows.'),
              slide(3, 'Wisconsin orientation', 'Read the first three pages of Wisconsin Legislature Ins 3.40(11)(a). Look at structure: who the rule covers, "complying plan" vs "non-complying plan," and its relationship to the NAIC model. Recognition over comprehension at this stage.'),
              slide(4, 'What you should be able to do', '- Define COB in your own words\n- Distinguish COB from coordination of care (CoC)\n- Recognize the four payer types in an Auto COB case\n- Articulate what "primacy" means at a sentence level'),
            ],
          },
          {
            slug: 'why-auto-cob-summary',
            title: 'Summary: The Auto COB Mental Model',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'Why Auto COB exists', 'When a health plan member is injured in a car accident, the same medical bills may be payable by multiple sources: the member\'s health insurance, auto med-pay or PIP, the at-fault driver\'s liability coverage, and possibly Medicare or Medicaid. Multiple payers can be legally obligated for the same expense.'),
              slide(2, 'What "primacy" means', 'Primacy answers one question: which payer is legally responsible to pay **first**? It is purely about ordering — not whether a service is covered, not whether the policy has benefits remaining, not whether the treatment was medically necessary. Secondary payers reduce their payment to keep total reimbursement at 100% of allowable expenses.'),
              slide(3, 'The cost of getting it wrong', '**Leakage** occurs when a health plan pays for medical expenses that auto insurance should have covered. At scale, leakage produces duplicate payment exposure, audit findings, and regulatory risk. CMS takes MSP violations seriously — penalties can reach double damages.'),
              slide(4, 'Terminology to settle now', '**Coordination of Care** (clinical workflow between providers) ≠ **Coordination of Benefits** (financial workflow between payers). Always say "COB" or "coordination of benefits." Never use the unqualified word "coordination."'),
            ],
          },
          {
            slug: 'why-auto-cob-worked-example',
            title: 'Worked Example: A First Look at the Multi-Payer Problem',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Member: Sarah K., age 34, Wisconsin resident. Accident: two-vehicle collision at an intersection. Fault: disputed. Medical bills: $11,400 (ED + orthopedic follow-up). Health plan: commercial PPO. Auto policy: includes $5,000 med-pay rider.'),
              slide(2, 'Recognition pattern', 'The claim arrives with ICD-10 trauma codes (S72.xx, S13.xx), emergency room place of service (POS 23), and an accident date in the member notes. These three signals together say: **investigate for third-party involvement before paying**.'),
              slide(3, 'Identifying the payers in play', '1. **Commercial health plan** — obligated if no other primary payer\n2. **Auto med-pay ($5,000)** — her own policy; no-fault, pays regardless of who caused the accident\n3. **At-fault driver\'s BI liability** — available if the other driver is found negligent\n4. **Medicare / Medicaid** — not applicable here (member is 34, not dually enrolled)\n\nThe question we haven\'t answered yet: which pays first?'),
              slide(4, 'The question for subsequent chapters', 'We\'ve identified the payers. Now: in what order do they pay, and what happens to each payer\'s obligation after the one ahead of it pays? That is the subject of Chapters 2–4. For now, the takeaway is: **don\'t pay until you know the order**.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Why Auto COB Exists',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'COB definition',
              stem_markdown: 'What does "Coordination of Benefits" (COB) determine?',
              mc_options: [
                'Which provider performed the most significant medical service',
                'Which payer is legally responsible to pay first when multiple payers cover the same medical expense',
                'Whether a health plan\'s contract includes auto accident coverage',
                'The clinical workflow that coordinates care among multiple providers',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'COB is solely about **ordering** — which payer pays first and how much each pays. It does not determine clinical appropriateness (COC), contract coverage, or benefit limits.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Recognition signals',
              stem_markdown: 'An analyst receives a claim with trauma diagnosis codes, emergency room place of service, and an injury date note in the member record. What should she do first?',
              mc_options: [
                'Process the claim normally — trauma codes are common in the ED',
                'Deny the claim pending COC coordination with the treating physicians',
                'Flag it as a possible Auto COB case and investigate for third-party involvement',
                'Route to the subrogation team immediately without reviewing the claim',
              ],
              mc_correct_option: 'c' as const,
              mc_explanation_markdown: 'Trauma codes + ER POS + an injury date are classic Auto COB recognition signals. The analyst must confirm whether auto insurance is available and primary before the health plan pays.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Leakage',
              stem_markdown: '"Leakage" in the context of Auto COB refers to:',
              mc_options: [
                'Incomplete medical records in the claim file',
                'A health plan paying for medical expenses that auto insurance should have covered',
                'The gap between what a provider bills and what the plan allows',
                'Premium revenue lost when members switch plans',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Leakage is the dollar loss that results when the health plan pays as primary for expenses that another payer — typically auto med-pay or liability — should have covered.',
            },
          ],
        },
      },
      {
        slug: 'multi-payer-problem',
        title: 'The Multi-Payer Problem',
        description: 'Identifying all payers potentially in play for an auto accident case.',
        module_order: 2,
        lessons: [
          {
            slug: 'multi-payer-reading-guide',
            title: 'Reading Guide: Payer Types in Auto COB',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Primary sources', 'Review the payer-identification section of the COB Flow Product Spec (§ 5.2) and the ForwardHealth COB Training deck slides 8–15 covering TPL payer types.'),
              slide(2, 'MSP orientation', 'Read CMS\'s Medicare Secondary Payer fact sheet (MSP Manual Chapter 1). Focus on the list of primary payer situations — particularly no-fault and liability insurance. You do not need to master the Medicare billing coordination rules yet.'),
              slide(3, 'Learning objectives', '- Name the four payer types most common in Auto COB cases\n- Distinguish med-pay from PIP from liability\n- Identify when Medicare or Medicaid is in scope for a given claim'),
            ],
          },
          {
            slug: 'multi-payer-summary',
            title: 'Summary: The Four Payer Types',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'The four payers in an Auto COB case', '1. **Health plan** — the member\'s commercial insurance, Medicare Advantage, or Medicaid managed care\n2. **Auto med-pay / PIP** — the member\'s own auto policy; pays regardless of fault\n3. **At-fault liability (BI)** — the other driver\'s bodily injury coverage; requires fault determination\n4. **Medicare / Medicaid** — if the member is elderly, disabled, or low-income; always payer of last resort'),
              slide(2, 'Med-pay vs. PIP', '**Med-pay** covers medical expenses only; no lost wages; available in tort (at-fault) states like Wisconsin. **PIP** provides broader no-fault benefits including lost wages and rehabilitation; mandatory in true no-fault states. Wisconsin is an at-fault state — med-pay is optional, PIP is not mandated.'),
              slide(3, 'Medicare Secondary Payer rules', 'Under the MSP Act, Medicare is **secondary** when a no-fault or liability insurance plan is available. This means the auto insurer pays first; Medicare pays only what remains. MSP violations carry double-damages penalties.'),
            ],
          },
          {
            slug: 'multi-payer-worked-example',
            title: 'Worked Example: Mapping the Payers',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Member: James P., age 68, Medicare + commercial Medigap supplement. Hit by a driver who ran a red light. Medical bills: $24,000. James\'s auto policy: $10,000 med-pay. At-fault driver: insured with $100,000 BI limit.'),
              slide(2, 'Mapping the payers', '| Payer | Type | Basis |\n|---|---|---|\n| James\'s auto med-pay | No-fault | His own policy |\n| At-fault driver\'s BI | Liability | Other driver\'s policy |\n| Medicare | Gov\'t | MSP secondary rules |\n| Medigap supplement | Supplemental | Follows Medicare |\n| Health plan | N/A | No separate commercial plan |'),
              slide(3, 'Key insight', 'Medicare cannot pay as primary here because auto insurance (both med-pay and BI liability) is available. The MSP rules require those payers to go first. If Medicare were billed first, the plan administrator could face double-damages liability under the MSP Act.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: The Multi-Payer Problem',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Payer types',
              stem_markdown: 'Which four payer types most commonly overlap in an Auto COB case?',
              mc_options: [
                'Health plan, auto med-pay/PIP, at-fault liability, Medicare/Medicaid',
                'Health plan, dental plan, vision plan, and pharmacy benefits',
                'Medicare, Medicaid, CHIP, and ERISA self-funded plans',
                'Auto med-pay, workers\' comp, disability, and liability',
              ],
              mc_correct_option: 'a' as const,
              mc_explanation_markdown: 'The four payer types are: the health plan, auto med-pay/PIP (the member\'s own auto policy), the at-fault driver\'s BI liability coverage, and Medicare/Medicaid if applicable.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Medicare Secondary Payer',
              stem_markdown: 'A 68-year-old Medicare beneficiary is injured in an auto accident. Her auto policy includes $5,000 med-pay. Under Medicare Secondary Payer (MSP) rules, Medicare\'s role is:',
              mc_options: [
                'Primary payer because she is over age 65',
                'Secondary to the auto med-pay coverage — auto pays first',
                'Equal co-payer splitting costs 50/50 with auto insurance',
                'Not applicable — Medicare does not cover auto accident injuries',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The MSP Act makes Medicare secondary when no-fault or liability insurance is available. Auto med-pay is a no-fault coverage, so it pays before Medicare.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Med-pay vs. PIP',
              stem_markdown: 'Wisconsin is classified as an at-fault (tort liability) state. What does this mean for auto insurance?',
              mc_options: [
                'All Wisconsin drivers must carry PIP coverage',
                'No-fault PIP benefits are mandatory under Wisconsin law',
                'Wisconsin does not mandate PIP; injured parties pursue the at-fault party\'s liability coverage',
                'Wisconsin requires med-pay and prohibits PIP',
              ],
              mc_correct_option: 'c' as const,
              mc_explanation_markdown: 'Wisconsin is a tort (at-fault) state. PIP is not mandated. Med-pay is optional but common. Recovery typically flows through the at-fault driver\'s liability coverage once fault is established.',
            },
          ],
        },
      },
      {
        slug: 'primacy-and-consequences',
        title: 'Primacy and Its Consequences',
        description: 'What primacy means, how it differs from coverage, and what happens downstream when it\'s wrong.',
        module_order: 3,
        lessons: [
          {
            slug: 'primacy-reading-guide',
            title: 'Reading Guide: Primacy Rules',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Review NAIC Model COB Regulation §§ 1–5 (definitions and order-of-benefit rules). These sections establish the vocabulary used throughout Wisconsin and most commercial plans.'),
              slide(2, 'Subrogation overview', 'Read the subrogation overview chapter from the COB Flow Handoff document. Focus on the relationship between primacy determination → incorrect payment → subrogation recovery.'),
              slide(3, 'Learning objectives', '- Articulate primacy at a sentence level\n- Distinguish primacy from contract coverage, benefit limits, and clinical appropriateness\n- Explain what happens to secondary payer math after primary pays'),
            ],
          },
          {
            slug: 'primacy-summary',
            title: 'Summary: Primacy, Coverage, and the Payment Math',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'Primacy vs. coverage vs. appropriateness', '- **Primacy**: which payer pays first (ordering)\n- **Coverage**: does this policy cover this service at all? (scope)\n- **Benefit limits**: how much does the policy pay? (amount)\n- **Clinical appropriateness**: is this medically necessary? (clinical)\n\nCOB analysts answer the primacy question only. The other questions are handled by different workflows.'),
              slide(2, 'Secondary payer math', 'Once primary pays, secondary\'s obligation = (Allowable expense) − (Primary payment). If primary pays in full, secondary owes nothing. The combined payment can never exceed 100% of the allowable expense — that is the anti-enrichment principle of COB.'),
              slide(3, 'When primacy is wrong: consequences', 'If the health plan pays as primary when auto insurance should have paid first:\n1. The health plan has overpaid\n2. A subrogation right arises against the auto insurer\n3. If not recovered, this is leakage — permanent dollar loss\n4. At scale, leakage triggers audit findings and regulatory scrutiny'),
            ],
          },
          {
            slug: 'primacy-worked-example',
            title: 'Worked Example: Primacy Gets It Wrong',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'The error', 'Claim for ER visit after auto accident processed through the health plan as primary. Plan pays $8,200 (allowed amount). Six weeks later, review reveals: member had $10,000 auto med-pay that was never disclosed.'),
              slide(2, 'What should have happened', 'Auto med-pay should have paid first (up to $10,000). The $8,200 bill was fully within the med-pay limit. The health plan\'s correct payment was **$0**. By paying $8,200 as primary, the plan created leakage of $8,200.'),
              slide(3, 'Recovery path', 'The plan now has a subrogation right against the auto med-pay insurer. A demand letter is issued for $8,200. If the auto insurer had already paid the member, the demand goes to the member. Either way, the recovery cycle has just added cost that proper primacy determination would have avoided.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Primacy and Its Consequences',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Primacy definition',
              stem_markdown: '"Primacy" in Auto COB means:',
              mc_options: [
                'Which provider performed the most significant medical service',
                'Which payer is legally responsible to pay first for a covered expense',
                'Whether a health plan\'s contract includes auto accident coverage',
                'The maximum benefit limit under a coordination of benefits clause',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Primacy is purely about ordering — which payer pays first. It does not determine whether a service is covered, how much is paid, or whether care is medically necessary.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Subrogation',
              stem_markdown: 'A health plan pays an auto-injury claim that auto med-pay should have covered first. The health plan later discovers the error. Which recovery mechanism allows the plan to pursue the med-pay insurer?',
              mc_options: [
                'Coordination of Care protocol',
                'Subrogation',
                'Balance billing',
                'Stop-loss reinsurance',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Subrogation allows the health plan to step into the member\'s shoes and recover from the payer that should have paid first.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Secondary payer math',
              stem_markdown: 'Primary insurance pays $6,000 on an $8,000 allowable claim. Secondary insurance\'s maximum obligation is:',
              mc_options: [
                '$8,000 — secondary pays the full allowable',
                '$6,000 — secondary matches primary\'s payment',
                '$2,000 — secondary covers the remaining allowable',
                '$14,000 — both payers pay their full allowed amounts',
              ],
              mc_correct_option: 'c' as const,
              mc_explanation_markdown: 'Secondary pays (Allowable) − (Primary payment) = $8,000 − $6,000 = $2,000. Combined payment cannot exceed 100% of allowable ($8,000).',
            },
          ],
        },
      },
    ],
    capstoneQuiz: {
      title: 'Capstone Quiz: Foundations of Auto COB',
      questions: [
        {
          question_order: 1,
          question_type: 'multiple_choice' as const,
          topic: 'Recognition and triage',
          stem_markdown: 'A health insurance analyst receives a new claim from a member injured in a two-car accident. The claim includes ER services coded with trauma diagnosis codes. What is the most important next step?',
          mc_options: [
            'Process the claim under standard health plan rules and pay the allowed amount',
            'Flag the claim for Auto COB investigation to determine whether auto insurance is primary',
            'Deny the claim and instruct the member to submit to their auto insurer',
            'Send the claim directly to the subrogation team without investigating coverage',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'Trauma codes + ER + accident context require investigation before payment. Auto insurance may be primary; paying without investigating creates leakage.',
        },
        {
          question_order: 2,
          question_type: 'multiple_choice' as const,
          topic: 'Primacy vs. coverage',
          stem_markdown: '"Primacy" differs from "coverage" in that:',
          mc_options: [
            'Coverage determines which payer pays first; primacy determines whether a service is covered',
            'Primacy determines which payer pays first; coverage determines whether a service is within the policy\'s benefits',
            'Both terms refer to the same concept in COB law',
            'Coverage applies to ERISA plans only; primacy applies to insured plans',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'Primacy = ordering; coverage = scope. These are separate questions. A service can be covered but the health plan may still not be the primary payer.',
        },
        {
          question_order: 3,
          question_type: 'multiple_choice' as const,
          topic: 'Recovery after incorrect payment',
          stem_markdown: 'An analyst correctly identifies that auto med-pay is primary for $5,000 in medical bills. The health plan has already paid the claim. The next appropriate action is:',
          mc_options: [
            'Write off the overpayment as a business decision',
            'Initiate a subrogation recovery action against the auto med-pay insurer',
            'Request the member repay the health plan directly and close the case',
            'Issue a demand to the at-fault driver\'s liability carrier',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'The health plan has a subrogation right against the auto med-pay insurer. The med-pay insurer is the party that should have paid first.',
        },
        {
          question_order: 4,
          question_type: 'multiple_choice' as const,
          topic: 'MSP rules',
          stem_markdown: 'Under the Medicare Secondary Payer (MSP) Act, when is Medicare secondary to auto insurance?',
          mc_options: [
            'Only when the member is over age 65',
            'When a no-fault or liability insurance plan is available and has not been exhausted',
            'Medicare is never secondary to auto insurance',
            'Only when the auto insurer has paid at least $1,000',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'MSP makes Medicare secondary whenever no-fault or liability insurance is available — regardless of age or payment amount. Exhausting auto coverage before billing Medicare is required.',
        },
      ],
    },
  },

  // =========================================================================
  // Course 2 — Payer Identification & Ordering
  // =========================================================================
  {
    course: {
      slug: 'auto-cob-payer-ordering',
      title: 'Payer Identification & Ordering',
      description: 'Applying the NAIC COB framework to identify and order payers in auto accident cases.',
      estimated_hours: 5,
      sequence_order: 2,
    },
    modules: [
      {
        slug: 'naic-cob-framework',
        title: 'The NAIC COB Framework',
        description: 'The NAIC model rule\'s order-of-benefit determination process.',
        module_order: 1,
        lessons: [
          {
            slug: 'naic-reading-guide',
            title: 'Reading Guide: NAIC COB Model Regulation',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Read NAIC Model COB Regulation §§ 1–10. Focus on §§ 4–7 (order-of-benefit determination rules). These sections establish the birthday rule, active/inactive rule, and COBRA sequencing.'),
              slide(2, 'Wisconsin adoption', 'Review Wisconsin Ins 3.40 §§ (1)–(5) which adopt the NAIC framework with state-specific modifications. Note where Wisconsin deviates from the NAIC model.'),
              slide(3, 'Learning objectives', '- Apply the birthday rule for dependent children\n- Apply the active/inactive rule for COBRA coverage\n- Identify the correct primary plan in multi-employer scenarios'),
            ],
          },
          {
            slug: 'naic-summary',
            title: 'Summary: Order-of-Benefit Determination Rules',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'The birthday rule', 'For dependent children with parents who are not separated/divorced: the plan of the parent whose **birthday** (month and day only, not year) falls **earliest** in the calendar year is primary. Example: Parent A born March 15 → primary over Parent B born July 22.'),
              slide(2, 'Active vs. inactive coverage', 'A plan covering a person as an **active employee** is primary over a plan covering the same person as a laid-off, retired, or COBRA continuation participant. This prevents COBRA plans from becoming de facto primary payers.'),
              slide(3, 'Workers\' comp takes precedence', 'When an injury is work-related, workers\' compensation is primary for that injury, regardless of what other coverage exists. For an auto accident that occurs during work duties, WC typically pays before auto med-pay or health insurance.'),
            ],
          },
          {
            slug: 'naic-worked-example',
            title: 'Worked Example: Applying the Birthday Rule',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Dependent child covered under both parents\' employer plans. Parent A (birthday: April 3) is on COBRA from a prior employer. Parent B (birthday: October 11) has active employer coverage.'),
              slide(2, 'Applying the rules', 'Step 1 — active/inactive: Parent A\'s COBRA coverage is inactive. Parent B\'s active employer plan is primary over COBRA under the active/inactive rule. Step 2 — birthday rule not needed because active/inactive already resolved it.'),
              slide(3, 'Result', 'Parent B\'s active plan = primary. Parent A\'s COBRA plan = secondary. If Parent A also had active coverage, we would apply the birthday rule: April 3 (A) < October 11 (B), so Parent A would be primary.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: The NAIC COB Framework',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Birthday rule',
              stem_markdown: 'Under the NAIC birthday rule, a dependent child\'s primary plan is:',
              mc_options: [
                'The plan with the higher benefit limit',
                'The plan of the parent whose birthday (month and day) falls earlier in the calendar year',
                'Always the mother\'s plan unless both parents agree otherwise',
                'The plan issued most recently',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The birthday rule compares month and day only (not birth year). The parent with the earlier birthday in the year has the primary plan.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Active vs. inactive',
              stem_markdown: 'An active employee is also covered as a dependent under their spouse\'s COBRA continuation plan. Which plan is primary under the NAIC COB framework?',
              mc_options: [
                'The COBRA plan, because it has lower premiums',
                'The active employer plan, because active coverage is primary over inactive coverage',
                'They split costs 50/50 under the non-duplication rule',
                'The plan with the higher lifetime maximum is primary',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The active/inactive rule makes any plan covering a person as an active employee primary over a plan covering the same person as a COBRA or retired participant.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Workers\' comp',
              stem_markdown: 'A member is injured in an auto accident while making deliveries for his employer. Which payer is typically primary for the work-related injury?',
              mc_options: [
                'The member\'s personal auto med-pay policy',
                'The employer\'s commercial auto insurance',
                'Workers\' compensation',
                'The member\'s health plan',
              ],
              mc_correct_option: 'c' as const,
              mc_explanation_markdown: 'Work-related injuries are covered by workers\' compensation, which is primary over all other coverage for those injuries.',
            },
          ],
        },
      },
      {
        slug: 'auto-med-pay-pip',
        title: 'Auto Med-Pay and PIP',
        description: 'How auto med-pay and PIP coverage work and interact with health insurance.',
        module_order: 2,
        lessons: [
          {
            slug: 'med-pay-reading-guide',
            title: 'Reading Guide: Auto First-Party Medical Coverage',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Review ISO auto policy forms covering med-pay provisions (PP 00 01). Compare to PIP endorsements used in no-fault states. Review the Wisconsin auto insurance statutes (Wis. Stat. ch. 632) for med-pay requirements.'),
              slide(2, 'Learning objectives', '- Distinguish med-pay from PIP\n- Identify Wisconsin\'s auto insurance requirements for first-party medical coverage\n- Explain how med-pay and health insurance interact when both are available'),
            ],
          },
          {
            slug: 'med-pay-summary',
            title: 'Summary: Med-Pay, PIP, and Health Plan Interaction',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'Med-pay basics', '**Med-pay** (Medical Payments coverage) pays medical expenses for the insured and passengers injured in the vehicle, regardless of fault. Wisconsin drivers may purchase it as an optional add-on. Limits typically range from $1,000 to $25,000.'),
              slide(2, 'How med-pay interacts with health insurance', 'Most health plans treat available auto med-pay as primary. The plan\'s COB provision will not pay for expenses the auto policy should cover. When med-pay is exhausted, the health plan steps in for remaining covered expenses.'),
              slide(3, 'Non-duplication clauses', 'Some auto policies include a **non-duplication clause**: the auto insurer won\'t pay for benefits already paid by another insurer. This clause can create a gap between what the health plan and auto insurer each think the other will pay. Analysts must identify non-duplication language during coverage verification.'),
            ],
          },
          {
            slug: 'med-pay-worked-example',
            title: 'Worked Example: Med-Pay Exhaustion',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Member has $5,000 auto med-pay. Total medical bills from accident: $12,400. Health plan is commercial PPO.'),
              slide(2, 'Payment sequence', '1. Auto med-pay pays first: $5,000 (exhausted)\n2. Health plan steps in for remainder: $12,400 − $5,000 = $7,400 (subject to plan\'s allowed amount and member cost-share)\n3. Member pays deductible + coinsurance on the health plan portion'),
              slide(3, 'What the analyst verifies', '- Med-pay policy declarations page (confirm $5,000 limit)\n- Med-pay Explanation of Benefits (confirm it paid the first $5,000)\n- Health plan claim submission: reflect auto med-pay payment as coordination credit'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Auto Med-Pay and PIP',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Med-pay vs. PIP',
              stem_markdown: 'What distinguishes Med-Pay from PIP (Personal Injury Protection)?',
              mc_options: [
                'Med-Pay requires fault to be established; PIP does not',
                'PIP typically provides broader no-fault benefits including lost wages; Med-Pay covers medical expenses only',
                'Med-Pay is mandatory in Wisconsin; PIP is optional',
                'PIP only covers the policyholder; Med-Pay covers all vehicle occupants',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'PIP is broader: it covers lost wages, rehabilitation, and sometimes death benefits. Med-pay covers medical and funeral expenses only. Both are no-fault.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Wisconsin auto insurance',
              stem_markdown: 'Wisconsin is an at-fault (tort liability) state. What does this mean for first-party medical coverage?',
              mc_options: [
                'All Wisconsin drivers must carry PIP coverage as a mandatory auto benefit',
                'No-fault PIP benefits are mandatory under Wisconsin law',
                'Wisconsin does not mandate PIP; injured parties seek recovery through the at-fault party\'s liability coverage',
                'Wisconsin requires med-pay and prohibits the purchase of PIP',
              ],
              mc_correct_option: 'c' as const,
              mc_explanation_markdown: 'Wisconsin is a tort state. PIP is not required. Med-pay is optional. Injured parties primarily rely on the at-fault driver\'s BI liability coverage for compensation.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Non-duplication clause',
              stem_markdown: 'An auto policy contains a "non-duplication" clause. What does this mean for a member who also has health insurance?',
              mc_options: [
                'The auto insurer will pay double the allowable expense to compensate for the member\'s dual coverage',
                'The auto insurer will not pay for benefits that another insurer (the health plan) has already paid',
                'The member must choose one coverage and waive the other',
                'Both insurers pay independently without coordination',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'A non-duplication clause prevents double-recovery. The auto insurer only pays for amounts NOT already reimbursed by another carrier. Analysts must identify this clause to avoid a coverage gap.',
            },
          ],
        },
      },
      {
        slug: 'health-auto-intersection',
        title: 'Health-Auto Intersection',
        description: 'ERISA preemption, subrogation rights, and the made-whole doctrine.',
        module_order: 3,
        lessons: [
          {
            slug: 'health-auto-reading-guide',
            title: 'Reading Guide: ERISA and Subrogation',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Read US v. Sereboff (2006) case summary (2 pages). Read the DOL\'s ERISA subrogation guidance. Review Wisconsin\'s made-whole doctrine as stated in Ruckel v. Gassner and subsequent cases.'),
              slide(2, 'Learning objectives', '- Explain ERISA preemption and its effect on state anti-subrogation laws\n- Apply the made-whole doctrine and know when it does and does not apply to ERISA plans\n- Apply Wisconsin comparative negligence (§ 895.045) to recovery calculations'),
            ],
          },
          {
            slug: 'health-auto-summary',
            title: 'Summary: ERISA Preemption and Equitable Doctrines',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'ERISA preemption of state anti-subrogation laws', 'ERISA self-funded plans are generally exempt from state insurance law under 29 U.S.C. § 1144. This means state laws that limit subrogation rights (anti-subrogation statutes, made-whole doctrine) typically do **not** apply to ERISA plans. *Sereboff v. Mid Atlantic Medical Services* (2006) confirmed ERISA plans can enforce equitable reimbursement liens against a member\'s recovery.'),
              slide(2, 'The made-whole doctrine', 'State common law: the health plan cannot enforce its subrogation lien until the member has been **fully compensated** for all losses. In Wisconsin, this applies to state-regulated (fully-insured) plans. ERISA self-funded plans can contractually override this by including explicit anti-made-whole language in the plan document.'),
              slide(3, 'Wisconsin comparative negligence (§ 895.045)', 'Wisconsin uses modified comparative negligence: a plaintiff recovers **nothing** if 51% or more at fault. If less than 51% at fault, damages are reduced proportionally. For a recovery analyst, this means: if the member is found 51%+ at fault, there may be no liability recovery to subrogate against.'),
            ],
          },
          {
            slug: 'health-auto-worked-example',
            title: 'Worked Example: ERISA Plan Recovery',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'ERISA self-funded plan paid $42,000 for injuries from a Wisconsin auto accident. Member recovers $60,000 from the at-fault driver\'s BI liability insurer. Member\'s attorney fees: $20,000. Net member recovery: $40,000.'),
              slide(2, 'ERISA analysis', 'The plan\'s subrogation clause requires full reimbursement. Because this is an ERISA plan: (1) state anti-subrogation law doesn\'t apply; (2) the made-whole doctrine doesn\'t apply unless the plan document includes it. The plan can demand $42,000 from the $60,000 recovery, even if the net-of-fees recovery ($40,000) leaves the member under-compensated.'),
              slide(3, 'Equitable considerations', 'While legally permitted, demanding full reimbursement from a member who netted less than the plan\'s claim creates significant member relations risk. Best practice: analyst documents the situation and escalates to manager for a lien reduction discussion under the common-fund doctrine.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Health-Auto Intersection',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'ERISA preemption',
              stem_markdown: 'An ERISA self-funded plan has a subrogation and reimbursement clause. A member recovers $50,000 from the at-fault driver. Under ERISA, the plan\'s right to reimbursement is governed by:',
              mc_options: [
                'State anti-subrogation laws, which can limit the plan\'s recovery',
                'Federal ERISA law, which generally preempts state insurance regulations',
                'The made-whole doctrine, which always applies to ERISA plans',
                'Wisconsin Ins 3.40, which applies to all health plans in Wisconsin',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'ERISA\'s preemption clause (29 U.S.C. § 1144) generally preempts state laws regulating insurance. ERISA plans can enforce subrogation rights even when state law would prohibit it for insured plans.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Made-whole doctrine',
              stem_markdown: 'The made-whole doctrine holds that:',
              mc_options: [
                'The health plan is entitled to full reimbursement before the member receives any recovery',
                'The insurer may not recover until the insured has been fully compensated for all losses',
                'A 50/50 split between plan and member is always equitable',
                'Plans are not entitled to subrogation when the member bears any comparative negligence',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The made-whole doctrine protects the insured: the plan\'s subrogation right is subordinate until the member has been made whole for all losses. This applies to state-regulated (fully-insured) plans in Wisconsin.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Wisconsin comparative negligence',
              stem_markdown: 'Under Wisconsin\'s comparative negligence statute (Wis. Stat. § 895.045), a plaintiff found 55% at fault:',
              mc_options: [
                'Recovers damages reduced by 55%',
                'Recovers nothing — plaintiff is barred from recovery at 51% or more at fault',
                'Recovers full damages because Wisconsin is a pure comparative state',
                'Recovers only economic damages, not non-economic damages',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Wisconsin uses the 51% bar rule: if the plaintiff is 51% or more at fault, they recover nothing. Below 51%, damages are reduced proportionally.',
            },
          ],
        },
      },
    ],
    capstoneQuiz: {
      title: 'Capstone Quiz: Payer Identification & Ordering',
      quiz_type: 'free_response' as const,
      questions: [
        {
          question_order: 1,
          question_type: 'free_response' as const,
          topic: 'Made-whole analysis in a fully-insured plan',
          stem_markdown: 'A Wisconsin resident is injured in a car accident caused by another driver. She has commercial health insurance through her employer (fully insured, Wisconsin-licensed PPO). The at-fault driver carries $100,000 in BI liability coverage. The health plan paid $40,000 in medical bills. The member\'s PI attorney negotiates a $75,000 settlement from the at-fault driver\'s insurer and asserts — citing the Wisconsin made-whole doctrine — that his client has not been fully compensated for all losses and therefore the plan\'s subrogation lien is not yet enforceable.\n\nWalk through the analytical sequence the COB analyst should follow before responding to the attorney\'s demand.',
          fr_model_answer_markdown: 'The first step is to confirm the plan\'s classification: this is a Wisconsin-licensed fully-insured commercial plan, not an ERISA self-funded plan. That classification is determinative — because the plan is state-regulated, Wisconsin\'s made-whole doctrine applies. Under the doctrine (articulated in Wisconsin common law and recognized in *Ruckel v. Gassner*), the insurer\'s subrogation right is subordinate until the insured has been fully compensated for all losses.\n\nThe analyst must then estimate the member\'s total damages: economic damages (medical bills, lost wages, rehabilitation costs) plus non-economic damages (pain and suffering, loss of consortium). If total damages exceed the $75,000 settlement recovery, the member is not made whole and the plan\'s lien cannot be enforced in full. For example, if total damages are $120,000, the made-whole shortfall is $45,000, and the plan\'s equitable recovery is limited to: (Plan payment / Total damages) × Settlement = ($40,000 / $120,000) × $75,000 = $25,000.\n\nIf total damages are less than or equal to $75,000, the member is made whole and the plan can demand full reimbursement (subject to the common-fund doctrine requiring a pro-rata attorney fee contribution).\n\nThe analyst must document the damages estimate methodology, the made-whole determination, and the calculated recovery in the audit log with a justification entry. If the calculated recovery differs from the plan\'s full $40,000 demand by more than the analyst\'s lien-reduction authority band, the analyst must escalate to a supervisor or manager before responding to the attorney.',
          fr_grading_rubric_markdown: '- **Plan classification**: correctly identifies that the Wisconsin-licensed fully-insured plan is subject to state law and therefore the made-whole doctrine applies (distinguish from ERISA self-funded plans, which can contractually override it)\n- **Made-whole calculation**: describes the method for determining whether the member is made whole — compare total damages to total recovery — and applies the pro-rata formula if the member is not made whole\n- **Documentation and escalation**: identifies the audit log justification requirement and the authority-band escalation trigger if the calculated recovery falls outside the analyst\'s lien-reduction ceiling',
          mc_options: null,
          mc_correct_option: null,
          mc_explanation_markdown: null,
        },
        {
          question_order: 2,
          question_type: 'free_response' as const,
          topic: 'ERISA preemption pivot',
          stem_markdown: 'Take the same fact pattern from Q1 — Wisconsin auto accident, $40,000 in plan payments, $75,000 settlement from the at-fault driver — but the health plan is now **self-funded under ERISA**. The Summary Plan Description (SPD) includes the following language: *"The plan\'s subrogation and reimbursement rights are not subject to the made-whole doctrine, the common-fund doctrine, or any similar equitable limitation imposed by state law."*\n\nHow does the analysis change? Identify each step in the workflow that produces a different result or requires a different action, and explain why.',
          fr_model_answer_markdown: 'The pivot at step one is decisive: the plan is ERISA self-funded, not state-regulated. Under 29 U.S.C. § 1144, ERISA preempts state laws that "relate to" employee benefit plans. Wisconsin\'s made-whole doctrine is a state common-law rule governing insurance contracts; under ERISA preemption, it does not apply to self-funded plans. *Sereboff v. Mid Atlantic Medical Services* (2006) confirmed that ERISA plans may enforce equitable reimbursement liens against specifically identified funds — the settlement proceeds — in the member\'s possession.\n\nBecause the SPD includes explicit anti-made-whole and anti-common-fund language, the plan is not even contractually bound by those doctrines in equity. The workflow differences are concrete:\n\n1. **Made-whole analysis is bypassed.** The analyst does not estimate total damages or calculate the pro-rata formula. The plan may demand its full $40,000 regardless of whether the $75,000 settlement leaves the member under-compensated.\n2. **SPD language review replaces doctrine analysis.** The analyst must locate and cite the specific SPD anti-limitation clause in the audit log. If the SPD were silent on those doctrines, equitable principles could still apply under *Sereboff*, so the exact SPD language matters.\n3. **Common-fund doctrine is also inapplicable per the SPD.** Under a state-regulated plan the analyst would calculate the plan\'s pro-rata attorney fee obligation. Here, the SPD explicitly disclaims the common-fund doctrine, so the plan can demand the full $40,000 without contributing to the member\'s attorney fees.\n4. **Audit log entry changes.** Instead of a made-whole justification, the log entry must document: ERISA self-funded classification, SPD clause citation, and the basis for asserting the full $40,000 demand.\n\nThe dollar outcome is materially different: ERISA plan recovers $40,000; a state-regulated plan in the same facts might be limited to $25,000 or less.',
          fr_grading_rubric_markdown: '- **ERISA preemption mechanics**: correctly identifies that ERISA preempts Wisconsin\'s made-whole doctrine for self-funded plans, and cites the preemption clause and *Sereboff* as the controlling authority\n- **Workflow diff**: enumerates at least three concrete steps that produce a different result under ERISA vs. state law (made-whole bypass, SPD language review, common-fund disclaimer effect, audit log content)\n- **SPD language significance**: explains why the specific anti-limitation language in the SPD matters and what the result would be if the SPD were silent on those doctrines',
          mc_options: null,
          mc_correct_option: null,
          mc_explanation_markdown: null,
        },
      ],
    },
  },

  // =========================================================================
  // Course 3 — Wisconsin Regulations
  // =========================================================================
  {
    course: {
      slug: 'auto-cob-wisconsin-regs',
      title: 'Wisconsin Auto COB Regulations',
      description: 'Wisconsin Ins 3.40, complying vs. non-complying plans, and state overlay analysis.',
      estimated_hours: 4,
      sequence_order: 3,
    },
    modules: [
      {
        slug: 'wi-ins-340-overview',
        title: 'Wisconsin Ins 3.40 Overview',
        description: 'Structure and scope of Wisconsin\'s COB administrative rule.',
        module_order: 1,
        lessons: [
          {
            slug: 'wi-340-reading-guide',
            title: 'Reading Guide: Wisconsin Ins 3.40',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Read Wisconsin Administrative Code § Ins 3.40 in full. Focus on subsections (1)–(5) (definitions and scope) and (11)(a) (COB rule for health insurers). This is the primary Wisconsin regulatory text for health insurance COB.'),
              slide(2, 'Learning objectives', '- Identify which plans are subject to Wisconsin Ins 3.40\n- Define "complying plan" and "non-complying plan" under the rule\n- Apply the basic order-of-benefits rule for a complying/non-complying scenario'),
            ],
          },
          {
            slug: 'wi-340-summary',
            title: 'Summary: Wisconsin\'s COB Framework',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'Scope of Ins 3.40', 'Wisconsin Ins 3.40 applies to health insurers, HMOs, and other insurers subject to Wisconsin\'s insurance code. It does **not** apply to self-insured employer plans governed by ERISA (federal preemption) or Medicare/Medicaid.'),
              slide(2, 'Complying plan defined', 'A **complying plan** is a health plan that includes a COB provision meeting Wisconsin\'s required standards. Most Wisconsin-licensed commercial health plans and HMOs are complying plans.'),
              slide(3, 'Non-complying plan defined', 'A **non-complying plan** is a plan that does not include a standard COB provision — most commonly an auto med-pay policy, which is not designed as a health insurance product and therefore lacks a COB clause.'),
            ],
          },
          {
            slug: 'wi-340-worked-example',
            title: 'Worked Example: Identifying Plan Types',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Scenario', 'A Wisconsin PPO (licensed commercial plan) and an auto med-pay policy ($10,000) cover the same injured member.'),
              slide(2, 'Classification', '- Wisconsin PPO: **complying plan** (licensed under Wisconsin insurance code, includes standard COB clause)\n- Auto med-pay: **non-complying plan** (auto product, no COB provision)\n\nThis is the most common complying/non-complying pairing in Auto COB cases.'),
              slide(3, 'What happens next', 'The rule determines which plan pays what — covered in the next module (Complying vs. Non-Complying Plans). At this stage, classification is the deliverable.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Wisconsin Ins 3.40 Overview',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Scope of Ins 3.40',
              stem_markdown: 'Wisconsin Administrative Code § Ins 3.40 governs COB for:',
              mc_options: [
                'Workers\' compensation plans only',
                'Health insurers, HMOs, and other Wisconsin-licensed insurance plans',
                'Medicare Advantage plans sold in Wisconsin',
                'All auto insurance policies issued in Wisconsin',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Ins 3.40 applies to Wisconsin-licensed health insurers and HMOs. ERISA self-funded plans, Medicare, and Medicaid are outside its scope.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'ERISA exemption',
              stem_markdown: 'Which of the following plans is typically exempt from Wisconsin Ins 3.40?',
              mc_options: [
                'A commercial PPO offered by a Wisconsin-licensed carrier',
                'A self-insured employer plan governed by ERISA',
                'A Wisconsin HMO serving state employees',
                'An individual market plan sold on the Wisconsin ACA exchange',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'ERISA self-funded plans are exempt from state insurance regulation under federal preemption. They are not subject to Wisconsin Ins 3.40.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Complying plan definition',
              stem_markdown: 'Under Wisconsin Ins 3.40, a "complying plan" is a health plan that:',
              mc_options: [
                'Pays claims within Wisconsin\'s prompt-pay timeframes',
                'Includes a COB provision that meets Wisconsin\'s required standards',
                'Covers the full cost of emergency services without prior authorization',
                'Participates in the Wisconsin Medicaid provider network',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'A complying plan is one that includes a COB clause meeting Ins 3.40\'s standards. This is distinct from other compliance requirements like prompt pay or network participation.',
            },
          ],
        },
      },
      {
        slug: 'complying-noncomplying-plans',
        title: 'Complying vs. Non-Complying Plans',
        description: 'How Ins 3.40 allocates payment obligations between complying and non-complying plans.',
        module_order: 2,
        lessons: [
          {
            slug: 'complying-reading-guide',
            title: 'Reading Guide: The Complying/Non-Complying Rule',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Read Wisconsin Ins 3.40(11)(a) in detail. This subsection contains the operative payment rule for complying vs. non-complying plan situations. Read the OCI guidance on applying this rule to auto med-pay scenarios.'),
              slide(2, 'Learning objectives', '- Apply the complying plan\'s liability limitation under Ins 3.40(11)(a)\n- Calculate a complying plan\'s maximum obligation when a non-complying plan is in the picture\n- Identify the most common scenario where this rule applies (auto med-pay)'),
            ],
          },
          {
            slug: 'complying-summary',
            title: 'Summary: The 3.40(11)(a) Payment Rule',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'The rule stated', 'When two plans cover the same person and one is a complying plan and one is a non-complying plan, the complying plan is primary. The complying plan\'s **maximum liability** is limited to what it would have paid if it were secondary (i.e., if the non-complying plan had paid first as a complying plan would).'),
              slide(2, 'Effect on the complying plan', 'The Wisconsin rule in effect treats the non-complying plan (auto med-pay) as if it were a complying primary plan, then calculates the health plan\'s secondary obligation. The health plan pays the lesser of: its actual liability, or what it would owe as secondary.'),
              slide(3, 'Why this matters', 'Without this rule, a health plan could find itself paying in full as primary simply because its counterpart auto policy has no COB clause. The rule prevents the absence of a COB clause in the auto policy from making the health plan the de facto primary payer.'),
            ],
          },
          {
            slug: 'complying-worked-example',
            title: 'Worked Example: Calculating the Complying Plan\'s Obligation',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Member has: (1) Wisconsin PPO (complying plan) with $10,000 allowed for the injury; (2) auto med-pay (non-complying plan) with $5,000 limit.'),
              slide(2, 'Applying the rule', 'Step 1: Treat auto med-pay as if it were primary complying plan → it pays $5,000.\nStep 2: Wisconsin PPO\'s maximum obligation = its secondary liability = $10,000 − $5,000 = **$5,000**.\nTotal payment: $5,000 (auto) + $5,000 (PPO) = $10,000 (the full allowed amount).'),
              slide(3, 'Key insight', 'The complying plan is not stuck paying zero just because auto med-pay is "primary." It pays what it would have owed as secondary. The rule ensures the member\'s total coverage is honored while preventing the health plan from bearing the full cost unilaterally.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Complying vs. Non-Complying Plans',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Complying/non-complying rule',
              stem_markdown: 'When a Wisconsin complying health plan and a non-complying auto med-pay plan cover the same person, what is the health plan\'s maximum liability under Ins 3.40(11)(a)?',
              mc_options: [
                'Zero — the non-complying plan pays everything',
                'What the health plan would have paid as secondary, had the non-complying plan paid first',
                '50% of the allowable expense',
                'The full allowable expense as if no other coverage existed',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The complying plan\'s liability is capped at its secondary obligation. This treats the auto med-pay as if it were a complying primary plan, limiting the health plan\'s exposure.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Why non-complying matters',
              stem_markdown: 'The complying/non-complying distinction in Wisconsin Ins 3.40 most commonly arises because:',
              mc_options: [
                'Some health plans fail to pay claims within Wisconsin\'s prompt-pay timeframe',
                'Auto med-pay policies typically do not include a standard COB provision',
                'Medicare Advantage plans are subject to different Wisconsin COB rules',
                'ERISA plans opt out of Wisconsin\'s COB requirements by plan design',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Auto med-pay policies are auto insurance products, not health insurance products. They don\'t include health-style COB clauses, making them "non-complying" under Ins 3.40.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Calculation',
              stem_markdown: 'A complying Wisconsin PPO allows $8,000 for an injury. A non-complying auto med-pay policy pays $3,000. Under Ins 3.40(11)(a), the complying plan\'s maximum payment is:',
              mc_options: [
                '$8,000 — it pays its full allowed amount regardless',
                '$5,000 — it pays the allowable less the auto med-pay payment',
                '$3,000 — it matches the auto med-pay payment',
                '$0 — the non-complying plan covers everything',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: '$8,000 − $3,000 = $5,000. The complying plan pays the allowable expense minus what the non-complying plan paid.',
            },
          ],
        },
      },
      {
        slug: 'state-overlay-analysis',
        title: 'State Overlay Analysis',
        description: 'Applying Wisconsin rules on top of the NAIC framework and ERISA preemption.',
        module_order: 3,
        lessons: [
          {
            slug: 'state-overlay-reading-guide',
            title: 'Reading Guide: State Overlay Methodology',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Review the COB Flow Handoff document section on state overlay methodology. Read the Wisconsin OCI guidance on coordination of benefits for auto accident cases.'),
              slide(2, 'Learning objectives', '- Apply the three-layer analysis: NAIC framework → ERISA preemption → Wisconsin state overlay\n- Identify when Wisconsin law applies vs. federal ERISA law\n- Apply Wisconsin\'s TPL rules to Medicaid cases'),
            ],
          },
          {
            slug: 'state-overlay-summary',
            title: 'Summary: The Three-Layer Analysis',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'Layer 1: NAIC framework', 'Start with the NAIC COB order-of-benefit rules (birthday rule, active/inactive, etc.). These provide the baseline applicable to most commercial plans.'),
              slide(2, 'Layer 2: ERISA preemption check', 'Is the health plan self-insured and governed by ERISA? If yes, Wisconsin Ins 3.40 and state anti-subrogation law generally do not apply. The ERISA plan document governs.'),
              slide(3, 'Layer 3: Wisconsin overlay', 'If the plan is a Wisconsin-licensed insured plan: apply Ins 3.40 on top of the NAIC rules. Check for complying/non-complying plan scenarios. Apply Wisconsin comparative negligence to recovery calculations.'),
            ],
          },
          {
            slug: 'state-overlay-worked-example',
            title: 'Worked Example: Full State Overlay Analysis',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Wisconsin member covered by: (1) ERISA self-funded employer plan; (2) spouse\'s Wisconsin-licensed commercial PPO; (3) auto med-pay ($8,000). Injured in auto accident.'),
              slide(2, 'Layer analysis', 'Layer 1 (NAIC): active/inactive rule — both plans are active. Birthday rule determines primary for the member as a dependent on spouse\'s plan.\nLayer 2 (ERISA): the employer plan is ERISA. Wisconsin Ins 3.40 doesn\'t apply to it.\nLayer 3 (Wisconsin): the spouse\'s PPO is a complying plan. Auto med-pay is non-complying. Ins 3.40(11)(a) applies to the spouse\'s plan only.'),
              slide(3, 'Takeaway', 'The ERISA plan and the Wisconsin PPO are analyzed under different legal frameworks. The analyst must identify the correct framework for each plan separately before calculating payment obligations.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: State Overlay Analysis',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'ERISA preemption test',
              stem_markdown: 'When applying Wisconsin\'s Auto COB rules, which factor is most important for determining whether ERISA preemption applies?',
              mc_options: [
                'Whether the employer is headquartered in Wisconsin',
                'Whether the health plan is self-insured by an employer (ERISA) or fully-insured (state law)',
                'Whether the member lives in Wisconsin at the time of the accident',
                'The number of employees at the employer sponsoring the plan',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'ERISA preemption turns on whether the plan is self-funded (ERISA) or fully-insured (state law). Headquarter location and member residence are not determinative.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Wisconsin Medicaid TPL',
              stem_markdown: 'A Wisconsin Medicaid beneficiary is injured in an auto accident and has available auto med-pay coverage. Under Wisconsin\'s TPL rules, which payer should pay first?',
              mc_options: [
                'Medicaid pays first; then seeks reimbursement from the auto insurer',
                'The auto med-pay insurer pays first; Medicaid is payer of last resort',
                'The two payers split costs 50/50',
                'Medicaid pays only if the auto med-pay limit has been exhausted first',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Wisconsin Medicaid is payer of last resort. All available third-party coverage, including auto med-pay, must be exhausted before Medicaid pays.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Three-layer analysis',
              stem_markdown: 'An analyst confirms the health plan is an ERISA self-funded plan covering a Wisconsin member injured in an auto accident. Which set of rules governs the plan\'s subrogation rights?',
              mc_options: [
                'Wisconsin anti-subrogation statutes',
                'Federal ERISA rules, which preempt Wisconsin state law for self-funded plans',
                'The NAIC model COB rule exclusively',
                'Both federal ERISA and Wisconsin law apply equally to self-funded plans',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'ERISA self-funded plans are governed by federal ERISA law. Wisconsin state anti-subrogation statutes are preempted. The plan document and federal common law govern recovery.',
            },
          ],
        },
      },
    ],
    capstoneQuiz: {
      title: 'Capstone Quiz: Wisconsin Auto COB Regulations',
      questions: [
        {
          question_order: 1,
          question_type: 'multiple_choice' as const,
          topic: 'Ins 3.40(11)(a) calculation',
          stem_markdown: 'Under Wisconsin Ins 3.40(11)(a), when a complying plan and a non-complying plan cover the same member, the complying plan\'s maximum liability is:',
          mc_options: [
            'Zero — the non-complying plan pays everything',
            'What the complying plan would have paid as secondary had the non-complying plan been primary',
            '50% of the allowable expense',
            'The full allowable expense as if no other coverage existed',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'Ins 3.40(11)(a) caps the complying plan\'s liability at its secondary obligation. This limits the health plan\'s exposure while still honoring the member\'s total coverage.',
        },
        {
          question_order: 2,
          question_type: 'multiple_choice' as const,
          topic: 'ERISA exemption from state law',
          stem_markdown: 'A Wisconsin HMO member is covered by her spouse\'s out-of-state ERISA self-funded plan. She is injured in an auto accident. Which law governs the ERISA plan\'s COB obligations?',
          mc_options: [
            'Wisconsin Ins 3.40, because the accident occurred in Wisconsin',
            'Federal ERISA, which preempts Wisconsin state insurance law for self-funded plans',
            'The law of the state where the spouse\'s employer is headquartered',
            'Both ERISA and Wisconsin law apply to ERISA plans equally',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'ERISA preemption is not geographic. A self-funded plan is governed by federal ERISA law regardless of where the accident occurs or where the employer is headquartered.',
        },
        {
          question_order: 3,
          question_type: 'multiple_choice' as const,
          topic: 'Wisconsin Medicaid TPL',
          stem_markdown: 'An analyst confirms that a Wisconsin Medicaid member has auto med-pay coverage. The claim should be:',
          mc_options: [
            'Paid by Medicaid first, with subrogation against the auto insurer afterward',
            'Routed to the auto insurer as primary; Medicaid pays only what remains',
            'Split 50/50 between Medicaid and the auto insurer',
            'Paid by Medicaid only if auto coverage has been exhausted',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'Wisconsin Medicaid is payer of last resort. The auto med-pay insurer must be billed first. Medicaid pays only after other available coverage is exhausted.',
        },
        {
          question_order: 4,
          question_type: 'multiple_choice' as const,
          topic: 'Non-complying plan identification',
          stem_markdown: 'The complying/non-complying plan distinction in Wisconsin Ins 3.40 most often arises because:',
          mc_options: [
            'Some health plans fail to comply with Wisconsin\'s prompt-pay requirements',
            'Auto med-pay policies do not include a standard health insurance COB provision',
            'Medicare Advantage plans follow federal COB rules, not Wisconsin\'s',
            'ERISA plans opt out of Ins 3.40 by including a preemption clause',
          ],
          mc_correct_option: 'b' as const,
          mc_explanation_markdown: 'Auto med-pay is an auto product lacking a health-style COB clause, making it a non-complying plan under Ins 3.40. This is the most common trigger for the complying/non-complying analysis.',
        },
      ],
    },
  },

  // =========================================================================
  // Course 4 — Recovery Workflows
  // =========================================================================
  {
    course: {
      slug: 'auto-cob-recovery-workflows',
      title: 'Recovery Workflows & Documentation',
      description: 'The recovery cycle, documentation requirements, authority limits, and audit readiness.',
      estimated_hours: 4,
      sequence_order: 4,
    },
    modules: [
      {
        slug: 'recovery-cycle-fundamentals',
        title: 'Recovery Cycle Fundamentals',
        description: 'The full recovery cycle from COB identification through subrogation closure.',
        module_order: 1,
        lessons: [
          {
            slug: 'recovery-reading-guide',
            title: 'Reading Guide: The Recovery Cycle',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Review COB Flow Product Spec § 5 (operational workflow) focusing on the recovery cycle sections. Review the COB Flow Handoff document\'s recovery universe overview.'),
              slide(2, 'Learning objectives', '- Describe the four phases of the Auto COB recovery cycle\n- Distinguish "demand" from "settlement" from "closure"\n- Explain when a lien reduction is appropriate'),
            ],
          },
          {
            slug: 'recovery-summary',
            title: 'Summary: From Identification to Closure',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'The four recovery phases', '1. **Identify**: recognize the auto COB case; verify coverage; determine primacy\n2. **Order**: determine payer sequence; route claim correctly\n3. **Recover**: if plan overpaid, issue demand; negotiate settlement; enforce lien\n4. **Close**: document outcome; apply closure authority; record in audit log'),
              slide(2, 'Key recovery actions', '- **Demand**: formal written notice to the at-fault party or insurer seeking reimbursement\n- **Settlement**: agreed resolution for less than the full demand amount\n- **Lien reduction**: reduction of the plan\'s reimbursement claim, typically when member\'s total recovery is limited\n- **Closure**: formal closing of the recovery file'),
              slide(3, 'Authority requirements', 'Every recovery action has an authority ceiling. Analysts act within their authorized limits. Above-ceiling amounts require escalation to supervisor (higher ceiling) or manager (highest ceiling). Authority ceilings are tracked in the COB Flow authority module.'),
            ],
          },
          {
            slug: 'recovery-worked-example',
            title: 'Worked Example: A Complete Recovery Cycle',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Member injured in two-car accident. Health plan paid $18,000 as primary (error — auto med-pay should have paid first). Auto med-pay limit: $10,000 (not yet tapped). At-fault BI coverage: $50,000 (available).'),
              slide(2, 'Recovery cycle applied', 'Phase 1 (Identify): COB investigation reveals auto med-pay was available and should have been primary.\nPhase 2 (Order): Correct the primacy — auto med-pay is primary up to $10,000; health plan as secondary owes $8,000.\nPhase 3 (Recover): Issue demand to auto med-pay insurer for $10,000 (plan\'s overpayment for that portion).\nPhase 4 (Close): Auto med-pay pays $10,000. Remaining plan payment ($8,000) was correctly secondary. File closed.'),
              slide(3, 'Authority check', 'The $10,000 demand is within the analyst\'s demand authority ceiling ($200,000 platform ceiling). No escalation required. Analyst documents the primacy determination and recovery in the audit log before closing.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Recovery Cycle Fundamentals',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Recovery cycle phases',
              stem_markdown: 'The Auto COB recovery cycle typically follows which sequence?',
              mc_options: [
                'Identify → Order payers → Recover → Close',
                'Deny claim → Appeal → Litigate → Settle',
                'Bill auto insurer → Receive payment → Close claim',
                'Request records → Apply MCG criteria → Issue determination',
              ],
              mc_correct_option: 'a' as const,
              mc_explanation_markdown: 'The four phases are: Identify (recognize the case), Order (determine primacy), Recover (demand/settle), Close (document and close). Each phase has specific actions and authority requirements.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Demand defined',
              stem_markdown: '"Demand" in the subrogation recovery context refers to:',
              mc_options: [
                'A member\'s request for services from their health plan',
                'A formal written notice to the at-fault party or their insurer seeking reimbursement',
                'A court order requiring payment of benefits',
                'The provider\'s bill for services rendered',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'A subrogation demand is a formal written notice to the liable party (or their insurer) asserting the plan\'s right to reimbursement for amounts paid.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Lien reduction authority',
              stem_markdown: 'Which type of recovery authority ceiling typically uses a percentage-based limit rather than a fixed dollar amount?',
              mc_options: [
                'Settlement authority',
                'Demand authority',
                'Lien reduction authority',
                'Closure authority',
              ],
              mc_correct_option: 'c' as const,
              mc_explanation_markdown: 'Lien reduction is measured as a percentage reduction of the plan\'s claim — e.g., "reduce the lien by up to 75%." This naturally requires a percentage ceiling rather than a dollar ceiling.',
            },
          ],
        },
      },
      {
        slug: 'documentation-audit',
        title: 'Documentation and Audit Readiness',
        description: 'What to document, what the audit log captures, and how to close a file compliantly.',
        module_order: 2,
        lessons: [
          {
            slug: 'documentation-reading-guide',
            title: 'Reading Guide: Documentation Standards',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Review the COB Flow audit log design (Handoff document § audit trail). Review the documentation checklist in the operations manual. Review CMS guidance on MSP case documentation requirements.'),
              slide(2, 'Learning objectives', '- Identify the key documents required to close an Auto COB file\n- Describe what the COB Flow audit log captures and why\n- Apply the justification field correctly for non-routine determinations'),
            ],
          },
          {
            slug: 'documentation-summary',
            title: 'Summary: The Audit-Ready File',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'Required documentation', '**Coverage verification**: auto policy declarations page confirming med-pay limit; health plan ID and COB clause.\n**Primacy rationale**: written explanation of how the order was determined and which rules applied.\n**Authority documentation**: for non-routine actions (lien reduction, settlement), the approval from the authority level that authorized it.'),
              slide(2, 'The audit log', 'Every state-changing action is recorded in the audit log: who acted, when, what the action was, and the outcome. The **justification field** captures the legal or factual basis for non-routine determinations. The audit log is append-only — no entries are modified or deleted.'),
              slide(3, 'Audit log ≠ coaching notes', 'Coaching notes are role-private feedback (supervisor/manager only). They are not part of the audit trail and never appear in the audit log. Always use the correct record type for the correct purpose.'),
            ],
          },
          {
            slug: 'documentation-worked-example',
            title: 'Worked Example: Building the Audit-Ready File',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'Auto COB case: plan overpaid $7,200 (auto med-pay was primary). Recovery demand issued and settled for $6,500 (within analyst\'s settlement authority ceiling).'),
              slide(2, 'Required file contents', '1. Auto policy declarations page (confirms $10,000 med-pay)\n2. Auto insurer EOB (confirms $0 paid — med-pay not previously tapped)\n3. Primacy determination memo: "Auto med-pay primary under NAIC active/inactive rule; Wisconsin PPO secondary"\n4. Demand letter (dated, amount, basis)\n5. Settlement agreement ($6,500, signed by both parties)\n6. Audit log entry: action=settlement, amount=$6,500, justification="within analyst ceiling, full recovery impractical due to coverage timeline"'),
              slide(3, 'Closure checklist', 'Before marking closed: (1) all docs in file; (2) audit log entry present with justification; (3) authority ceiling verified; (4) recovery applied against the original overpayment; (5) supervisor notified if settlement < 90% of demand.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Documentation and Audit Readiness',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Coverage verification document',
              stem_markdown: 'In an Auto COB case, which document most conclusively establishes that auto med-pay coverage was available?',
              mc_options: [
                'The member\'s health insurance ID card',
                'The auto insurer\'s declarations page showing med-pay coverage and limit',
                'The police accident report',
                'The treating provider\'s clinical notes',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The auto policy declarations page is the authoritative source for coverage type and limits. It confirms med-pay was in force at the time of the accident.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Audit log content',
              stem_markdown: 'The "justification" field in COB Flow\'s audit log is designed to capture:',
              mc_options: [
                'Automatic system decisions that require no human review',
                'The legal or factual basis for a non-routine determination',
                'A summary of all communications sent to the member',
                'The billing codes associated with the claim',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The justification field captures the analyst\'s reasoning for non-routine actions — e.g., why a lien was reduced, why a settlement was accepted below demand, or why coverage was denied.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Audit log vs. coaching notes',
              stem_markdown: 'Coaching notes in COB Flow are:',
              mc_options: [
                'Part of the audit log, visible to all users',
                'Role-private feedback (supervisor/manager only) that are separate from the audit trail',
                'Public notes visible to the member on their portal',
                'Automatically generated by the system without human input',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Coaching notes are a separate, role-private record. They never appear in the audit log and must not be used to record regulatory determinations.',
            },
          ],
        },
      },
      {
        slug: 'advanced-subrogation',
        title: 'Advanced Subrogation Scenarios',
        description: 'Common-fund doctrine, lien reductions, and Sereboff in practice.',
        module_order: 3,
        lessons: [
          {
            slug: 'subrogation-reading-guide',
            title: 'Reading Guide: Advanced Recovery Concepts',
            lesson_type: 'reading-guide' as const,
            slides: [
              slide(1, 'Sources', 'Read US v. Sereboff (2006) full opinion (12 pages). Read the common-fund doctrine summary from the COB Flow Handoff. Review the lien reduction guidelines from the COB Flow operations manual.'),
              slide(2, 'Learning objectives', '- Apply the common-fund doctrine to calculate equitable attorney fee allocation\n- Identify scenarios that trigger a lien reduction request\n- Apply Sereboff to analyze an ERISA plan\'s equitable lien rights'),
            ],
          },
          {
            slug: 'subrogation-summary',
            title: 'Summary: Common-Fund, Sereboff, and Lien Reductions',
            lesson_type: 'summary' as const,
            slides: [
              slide(1, 'The common-fund doctrine', 'When an attorney creates a fund that benefits multiple parties (member + health plan), the attorney may claim fees from all beneficiaries. In practice: the plan may be required to contribute to the member\'s attorney fees pro rata, reducing the plan\'s net recovery.'),
              slide(2, 'Sereboff and ERISA equitable liens', '*Sereboff v. Mid Atlantic Medical Services* (2006): ERISA plans can enforce equitable reimbursement liens against specifically identified funds in the member\'s possession (the settlement proceeds). This is "equitable" relief under ERISA § 502(a)(3), allowed even in the absence of a constructive trust.'),
              slide(3, 'When to request a lien reduction', 'A lien reduction is appropriate when: (1) the member\'s total recovery is limited (e.g., underinsured at-fault driver); (2) requiring full reimbursement would leave the member worse off than if they had no health insurance. The made-whole doctrine (for state plans) and equitable considerations (for ERISA plans) both support reduction in these cases.'),
            ],
          },
          {
            slug: 'subrogation-worked-example',
            title: 'Worked Example: Common-Fund and Lien Reduction',
            lesson_type: 'worked-example' as const,
            slides: [
              slide(1, 'Case setup', 'ERISA plan paid $30,000 for injuries. Member recovers $35,000 from at-fault driver (at policy limit — driver is underinsured). Member\'s attorney fees: $11,667 (1/3 contingency). Net member recovery: $23,333.'),
              slide(2, 'Full reimbursement analysis', 'Plan demands full $30,000. But the member\'s net recovery is only $23,333. Full reimbursement would give the plan $23,333 and leave the member with $0 net. The member\'s total losses exceed $100,000 — they are clearly not made whole.'),
              slide(3, 'Common-fund and lien reduction', 'Common-fund: plan owes its share of attorney fees → $30,000 / $35,000 × $11,667 = $10,000 plan share. Net plan claim: $30,000 − $10,000 = $20,000. Lien reduction: analyst escalates to manager for authority to reduce further, given underinsurance. Manager approves 15% additional reduction → final lien = $17,000.'),
            ],
          },
        ],
        quiz: {
          title: 'Module Quiz: Advanced Subrogation Scenarios',
          questions: [
            {
              question_order: 1,
              question_type: 'multiple_choice' as const,
              topic: 'Common-fund doctrine',
              stem_markdown: 'The "common-fund doctrine" in subrogation law holds that:',
              mc_options: [
                'All recovery funds must be deposited into a shared pool for court distribution',
                'An attorney who creates a fund benefiting multiple parties may claim fees from each beneficiary',
                'Plans must share recovery proceeds equally with the member',
                'Multi-party recovery funds must be distributed by a fiduciary',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'The common-fund doctrine allows the attorney who creates a settlement fund to claim fees proportionally from all beneficiaries, including the health plan. This reduces the plan\'s net recovery.',
            },
            {
              question_order: 2,
              question_type: 'multiple_choice' as const,
              topic: 'Lien reduction trigger',
              stem_markdown: 'Which scenario most likely triggers a lien reduction request?',
              mc_options: [
                'The at-fault driver was fully insured with a $500,000 BI policy',
                'The member\'s total recovery is limited because the at-fault driver was underinsured',
                'The member has a Medicare supplement that paid secondary benefits',
                'The health plan paid for services that were later denied by auto insurance',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: 'Lien reductions are equitable: they are appropriate when the member cannot be made whole because the at-fault party\'s coverage is insufficient. Full reimbursement from a limited recovery is inequitable.',
            },
            {
              question_order: 3,
              question_type: 'multiple_choice' as const,
              topic: 'Sereboff',
              stem_markdown: '*Sereboff v. Mid Atlantic Medical Services* (2006) is significant because it:',
              mc_options: [
                'Established Wisconsin\'s administrative rule on COB for commercial plans',
                'Confirmed ERISA plans can enforce equitable reimbursement liens against a member\'s settlement proceeds',
                'Created the NAIC model act for self-funded plan coordination',
                'Established Wisconsin\'s statute of limitations for subrogation claims',
              ],
              mc_correct_option: 'b' as const,
              mc_explanation_markdown: '*Sereboff* held that ERISA § 502(a)(3) permits plans to seek equitable relief — including enforcement of a reimbursement lien — against specifically identified funds (the settlement proceeds) in the member\'s possession.',
            },
          ],
        },
      },
    ],
    capstoneQuiz: {
      title: 'Capstone Quiz: Recovery Workflows & Documentation',
      quiz_type: 'free_response' as const,
      questions: [
        {
          question_order: 1,
          question_type: 'free_response' as const,
          topic: 'Pre-closure file review',
          stem_markdown: 'An auto claim file has been open for 18 months. The assigned analyst recommends closure with no recovery. Before flagging the file for closure, the SPD review template surfaced two facts: (1) the health plan was amended twice during the file\'s life — once at month 3 and once at month 11; and (2) the audit log shows two correspondence overrides entered by a supervisor, both during month 7.\n\nWalk through every records-verification and authority-confirmation step a Junior-level analyst must complete before recommending closure, and identify what an Admin must independently verify before approving the close.',
          fr_model_answer_markdown: 'A Junior-level analyst must work through four verification tracks before a no-recovery closure recommendation can stand.\n\n**1. SPD amendment timing.** The governing plan language for any subrogation claim is the SPD in effect on the date of loss, not the current SPD. The analyst must confirm that both amendments post-date the accident. If either amendment was effective before the date of loss, the analyst must re-run the subrogation and made-whole analysis under the earlier SPD version. If an amendment narrowed subrogation rights and was effective before the accident, the original analysis may have used incorrect authority.\n\n**2. Correspondence override justification.** Each supervisor override in the audit log must have a `justification` field entry explaining the basis and citing the supervisor\'s authority. The analyst reviews both override entries to confirm: (a) the supervisor\'s canPerform ceiling covered the override action; (b) the justification entry is present and complete; (c) the override did not commit the plan to a position inconsistent with a no-recovery close (e.g., a prior settlement offer that was never withdrawn).\n\n**3. No-recovery rationale.** The analyst must document affirmatively why no recovery is possible or warranted: at-fault driver uninsured or underinsured beyond the plan\'s recovery cost threshold, member found ≥51% at fault under Wis. Stat. § 895.045 (barring any recovery), statute of limitations elapsed, or an approved lien reduction reducing the balance to zero. The rationale must appear in the audit log with a justification entry before the close request is submitted.\n\n**4. Analyst closure authority.** A no-recovery closure is a closure action. The analyst must confirm their closure authority ceiling covers a $0-recovery close. If the original demand exceeded their ceiling at any point, the close may require the same approval level that authorized the demand.\n\n**Admin verification.** Before approving, an Admin must confirm: (a) the audit log shows a complete unbroken chain of custody with no unexplained gaps; (b) all supervisor overrides have compliant justification entries; (c) no open appeals, grievances, or member disputes reference this file; (d) the SPD amendment analysis is documented and reaches a supportable conclusion.',
          fr_grading_rubric_markdown: '- **SPD amendment analysis**: correctly identifies that the governing SPD is the version in effect on the date of loss, and describes the re-analysis step required if an amendment pre-dates the accident\n- **Override and authority chain**: describes verifying each correspondence override for supervisor authority ceiling compliance and justification-entry completeness, and explains that an uncommitted override position could block a no-recovery close\n- **Admin gate**: enumerates the Admin\'s independent verification responsibilities (audit log completeness, open disputes, SPD conclusion documentation) as distinct from the analyst\'s own checklist',
          mc_options: null,
          mc_correct_option: null,
          mc_explanation_markdown: null,
        },
        {
          question_order: 2,
          question_type: 'free_response' as const,
          topic: 'Authority-gap handling',
          stem_markdown: 'A Junior-level analyst is working a subrogation recovery file. The at-fault driver\'s liability insurer extends a $40,000 settlement offer with a 10-business-day response window. The analyst\'s settlement authority ceiling is $25,000. The analyst\'s assigned Supervisor is out of office for the full week and has not designated an acting supervisor.\n\nWalk through every audit-clean path available to this analyst. For each path, identify which step is a `canPerform` check, which requires a manager-grant escalation, and what the analyst must NOT do.',
          fr_model_answer_markdown: 'The analyst\'s first action is a `canPerform` check with the settlement action and amount. `canPerform` will return `{ decision: "requires_approval", approverRole: "SUPERVISOR", queueType: "settlement_approval" }` because the $40,000 offer exceeds the analyst\'s $25,000 ceiling. This is the system\'s signal that unilateral action is not authorized.\n\n**Path 1 — Escalate directly to manager.** Because the assigned supervisor is unavailable and has not designated an acting supervisor, the escalation path moves up the authority chain to the manager. The analyst submits a manager-grant escalation request in COB Flow, attaching the settlement offer, the file summary, and the response deadline. The manager\'s authority ceiling ($100,000 platform ceiling for settlement) covers this offer. The manager reviews and, if approving, logs the decision in the audit log with their own justification entry. `canPerform` is re-evaluated with the manager as the acting approver.\n\n**Path 2 — Request a deadline extension.** If the manager cannot respond before the offer expires, the analyst\'s next action is to contact opposing counsel to request a deadline extension. This is a correspondence action within the analyst\'s authority (correspondence does not require approval). The analyst logs the extension request and the response in the audit log.\n\n**Path 3 — Decline and counter within analyst ceiling.** If the analyst\'s analysis supports a counter at or below $25,000, they may counter unilaterally within their ceiling. However, the analyst must be confident this counter is in the plan\'s interest and must document the counter rationale. A counter that forfeits a clearly favorable offer above the analyst\'s ceiling without escalating would be an improper unilateral action.\n\n**What the analyst must NOT do:** (1) Accept the $40,000 offer without manager approval — this is an unauthorized settlement action and an audit violation; (2) Log a "tentative acceptance" or any language that could bind the plan to the offer; (3) Allow the offer to expire without logging a reason and escalating — silent expiration with no audit log entry is a recordkeeping violation.\n\nIn all paths, every action and non-action must have an audit log entry with a justification entry explaining the authority basis.',
          fr_grading_rubric_markdown: '- **canPerform mechanics**: correctly describes the canPerform check and its output (requires_approval, approverRole, queueType), and identifies the manager as the correct escalation target when the supervisor is unavailable without a designated acting supervisor\n- **Deadline management**: identifies the correspondence-level deadline extension request as an available action within the analyst\'s authority, and explains why it is necessary if the approval path cannot complete before expiry\n- **Prohibited actions**: explicitly identifies accepting the offer or logging any commitment without manager approval as an audit violation, and states that silent expiration without a log entry is also a recordkeeping violation',
          mc_options: null,
          mc_correct_option: null,
          mc_explanation_markdown: null,
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// platform authority ceilings
// ---------------------------------------------------------------------------

const AUTHORITY_CEILINGS = [
  { unlock_type: 'settlement',            ceiling_value: '100000.0000' },
  { unlock_type: 'demand',                ceiling_value: '200000.0000' },
  { unlock_type: 'lien_reduction',        ceiling_value: '75.0000'     }, // percentage
  { unlock_type: 'closure',              ceiling_value: '100000.0000' },
  { unlock_type: 'letter_override',       ceiling_value: '1.0000'      },
  { unlock_type: 'template_publication',  ceiling_value: '1.0000'      },
] as const;

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const reset = process.argv.includes('--reset');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // -----------------------------------------------------------------------
    // idempotency check
    // -----------------------------------------------------------------------
    const existing = await db
      .select({ id: courseSequences.id })
      .from(courseSequences)
      .where(eq(courseSequences.slug, LP_SLUG))
      .limit(1);

    if (existing.length > 0 && !reset) {
      console.log(`✓ Demo learning path already seeded (id: ${existing[0].id}). Pass --reset to reseed.`);
      return;
    }

    if (existing.length > 0 && reset) {
      console.log('⚠  --reset: deleting existing demo data…');
      // Delete demo courses first (cascades to modules/lessons/quizzes/questions)
      const demoCoursesToDelete = await db
        .select({ id: courses.id })
        .from(courses)
        .where(
          and(
            inArray(courses.slug, DEMO_COURSE_SLUGS),
            isNull(courses.tenant_id),
          )
        );
      if (demoCoursesToDelete.length > 0) {
        await db.delete(courses).where(
          inArray(courses.id, demoCoursesToDelete.map((c) => c.id))
        );
      }
      // Delete the learning path
      await db
        .delete(courseSequences)
        .where(eq(courseSequences.id, existing[0].id));
      console.log('   Deleted. Reseeding…');
    }

    // -----------------------------------------------------------------------
    // platform authority ceilings (idempotent: insert only if missing)
    // -----------------------------------------------------------------------
    console.log('Seeding platform authority ceilings…');
    for (const ceiling of AUTHORITY_CEILINGS) {
      const exists = await db
        .select({ id: platformAuthorityCeilings.id })
        .from(platformAuthorityCeilings)
        .where(eq(platformAuthorityCeilings.unlock_type, ceiling.unlock_type))
        .limit(1);
      if (exists.length === 0) {
        await db.insert(platformAuthorityCeilings).values({
          unlock_type:   ceiling.unlock_type,
          ceiling_value: ceiling.ceiling_value,
        });
        console.log(`  + ceiling: ${ceiling.unlock_type} = ${ceiling.ceiling_value}`);
      } else {
        console.log(`  ✓ ceiling already present: ${ceiling.unlock_type}`);
      }
    }

    // -----------------------------------------------------------------------
    // learning path
    // -----------------------------------------------------------------------
    console.log('\nInserting learning path…');
    const [lp] = await db
      .insert(courseSequences)
      .values({
        content_type: 'platform',
        tenant_id:    null,
        audience:     'analyst',
        slug:         LP_SLUG,
        name:         'Auto COB — Coordinating Benefits',
        description:  'End-to-end curriculum for coordinating benefits in Wisconsin auto accident cases. Covers foundational COB concepts, payer identification and ordering under the NAIC framework, Wisconsin Ins 3.40 regulations, and the full recovery workflow.',
        status:       'draft',
        author_id:    AUTHOR_ID,
      })
      .returning({ id: courseSequences.id });
    console.log(`  + learning path: ${lp.id}`);

    // -----------------------------------------------------------------------
    // courses, modules, lessons, quizzes, questions
    // -----------------------------------------------------------------------
    let totalModules = 0;
    let totalLessons = 0;
    let totalQuizzes = 0;
    let totalQuestions = 0;

    for (const entry of curriculum) {
      const { course: courseDef, modules: moduleDefs, capstoneQuiz } = entry;

      console.log(`\nInserting course: ${courseDef.title}`);
      const [course] = await db
        .insert(courses)
        .values({
          content_type:   'platform',
          tenant_id:      null,
          audience:       'analyst',
          slug:           courseDef.slug,
          title:          courseDef.title,
          description:    courseDef.description,
          estimated_hours: courseDef.estimated_hours,
          sequence_id:    lp.id,
          sequence_order: courseDef.sequence_order,
          status:         'draft',
          author_id:      AUTHOR_ID,
        })
        .returning({ id: courses.id });

      for (const modDef of moduleDefs) {
        const [mod] = await db
          .insert(modules)
          .values({
            course_id:    course.id,
            module_order: modDef.module_order,
            slug:         modDef.slug,
            title:        modDef.title,
            description:  modDef.description,
            status:       'draft',
          })
          .returning({ id: modules.id });
        totalModules++;

        // lessons
        for (let i = 0; i < modDef.lessons.length; i++) {
          const lessonDef = modDef.lessons[i];
          await db.insert(lessons).values({
            module_id:    mod.id,
            lesson_order: i + 1,
            lesson_type:  lessonDef.lesson_type,
            slug:         lessonDef.slug,
            title:        lessonDef.title,
            slides:       lessonDef.slides as unknown as Record<string, unknown>[],
          });
          totalLessons++;
        }

        // module quiz
        const [quiz] = await db
          .insert(quizzes)
          .values({
            module_id:      mod.id,
            course_id:      null,
            title:          modDef.quiz.title,
            pass_threshold: 80,
            quiz_type:      'multiple_choice',
            status:         'draft',
          })
          .returning({ id: quizzes.id });
        totalQuizzes++;

        for (const q of modDef.quiz.questions) {
          await db.insert(quizQuestions).values({
            quiz_id:              quiz.id,
            question_order:       q.question_order,
            question_type:        q.question_type,
            topic:                q.topic,
            stem_markdown:        q.stem_markdown,
            mc_options:           q.mc_options as unknown as Record<string, unknown>,
            mc_correct_option:    q.mc_correct_option,
            mc_explanation_markdown: q.mc_explanation_markdown,
          });
          totalQuestions++;
        }
      }

      // course capstone quiz
      const capQuizType = (capstoneQuiz as { quiz_type?: string }).quiz_type ?? 'multiple_choice';
      const [capQuiz] = await db
        .insert(quizzes)
        .values({
          module_id:      null,
          course_id:      course.id,
          title:          capstoneQuiz.title,
          pass_threshold: 80,
          quiz_type:      capQuizType,
          status:         'draft',
        })
        .returning({ id: quizzes.id });
      totalQuizzes++;

      for (const q of capstoneQuiz.questions) {
        const qAny = q as Record<string, unknown>;
        await db.insert(quizQuestions).values({
          quiz_id:                    capQuiz.id,
          question_order:             q.question_order,
          question_type:              q.question_type,
          topic:                      q.topic,
          stem_markdown:              q.stem_markdown,
          mc_options:                 (qAny.mc_options ?? null) as unknown as Record<string, unknown> | null,
          mc_correct_option:          (qAny.mc_correct_option ?? null) as string | null,
          mc_explanation_markdown:    (qAny.mc_explanation_markdown ?? null) as string | null,
          fr_model_answer_markdown:   (qAny.fr_model_answer_markdown ?? null) as string | null,
          fr_grading_rubric_markdown: (qAny.fr_grading_rubric_markdown ?? null) as string | null,
        });
        totalQuestions++;
      }
    }

    console.log('\n✅  Seed complete.');
    console.log(`   Learning paths : 1`);
    console.log(`   Courses        : ${curriculum.length}`);
    console.log(`   Modules        : ${totalModules}`);
    console.log(`   Lessons        : ${totalLessons}`);
    console.log(`   Quizzes        : ${totalQuizzes}`);
    console.log(`   Questions      : ${totalQuestions}`);

  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

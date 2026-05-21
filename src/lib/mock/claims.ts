import type { Claim } from "@/lib/types/claim";

export const SAMPLE_CLAIMS: Claim[] = [
  // c001 — WI auto, ERISA self-funded health + auto med-pay.
  //   Exercises: AUTO_MEDPAY_OPTIONAL primacy + WI overlay with ERISA-preemption note.
  {
    id: "c001", memberId: "m001", tenant: "t_carrier", caseState: "IN_RECOVERY",
    serviceDate: "2026-04-12", billedAmount: 87420.50, paidAmount: 41210.18,
    diagnosisCodes: ["S22.42XA", "S06.0X1A"], placeOfService: "21",
    providerSpecialty: "Orthopedic Surgery", accidentIndicator: "Y",
    accidentState: "WI", accidentDate: "2026-04-12",
    member: { id: "m001", firstName: "Marcus", lastName: "Reyes", dob: "1984-07-22", age: 41, relationship: "SELF" },
    coverages: [
      { id: "cov001a", planType: "AUTO_MEDPAY", payerName: "American Family Med-Pay", basis: "INSURED", funding: "N/A", hasExcessClause: false, effectiveDate: "2024-01-01" },
      { id: "cov001b", planType: "HEALTH", payerName: "Lakeshore Health Plan (self-funded)", basis: "ACTIVE_EMPLOYEE", funding: "SELF_FUNDED", hasCoordinationClause: true, hasEscapeClause: false, effectiveDate: "2019-05-01" },
    ],
    liability: { claimantFaultPct: 15, defendantFaultPct: 85, liabilityAccepted: true, attorneyOfRecord: "Habush Habush & Rottier, S.C." },
    recovery: { totalMedicalPaid: 41210.18, totalSettlement: 120000.00, attorneyFee: 40000.00, planGrossRecovery: 41210.18 },
  },

  // c002 — WI dependent child, both parents covered, birthday rule.
  //   Exercises: BIRTHDAY_RULE
  {
    id: "c002", memberId: "m002", tenant: "t_carrier", caseState: "ASSIGNED",
    serviceDate: "2026-03-29", billedAmount: 12440.00, paidAmount: 8210.00,
    diagnosisCodes: ["S82.101A", "W19.XXXA"], placeOfService: "23",
    providerSpecialty: "Emergency Medicine", accidentIndicator: "U",
    member: { id: "m002", firstName: "Lila", lastName: "Schmidt", dob: "2015-09-14", age: 10, relationship: "CHILD", parentsSeparated: false },
    coverages: [
      { id: "cov002a", planType: "HEALTH", payerName: "Anthem BCBS Wisconsin", basis: "DEPENDENT_CHILD", funding: "FULLY_INSURED", subscriberName: "Karl Schmidt", subscriberDob: "1981-06-04", effectiveDate: "2020-01-01" },
      { id: "cov002b", planType: "HEALTH", payerName: "Quartz Health Plan", basis: "DEPENDENT_CHILD", funding: "FULLY_INSURED", subscriberName: "Greta Schmidt", subscriberDob: "1982-03-21", effectiveDate: "2021-06-01" },
    ],
  },

  // c003 — WI senior, Medicare + large WI employer plan.
  //   Exercises: MSP_WORKING_AGED (employer headcount >=20)
  {
    id: "c003", memberId: "m003", tenant: "t_vendor", caseState: "GATHERING",
    serviceDate: "2026-05-02", billedAmount: 4280.00, paidAmount: 3120.00,
    diagnosisCodes: ["M25.561"], placeOfService: "11",
    providerSpecialty: "Family Practice", accidentIndicator: "N",
    member: { id: "m003", firstName: "Eleanor", lastName: "Whitaker", dob: "1956-02-08", age: 70, relationship: "SELF" },
    coverages: [
      { id: "cov003a", planType: "MEDICARE", payerName: "CMS Medicare Part B", basis: "MEDICARE", funding: "N/A", effectiveDate: "2021-03-01", medicareReason: "AGED" },
      { id: "cov003b", planType: "HEALTH", payerName: "WPS Health Insurance", basis: "ACTIVE_EMPLOYEE", funding: "FULLY_INSURED", effectiveDate: "2018-01-01", employerSize: "L", employerHeadcount: 240 },
    ],
  },

  // c004 — WI auto accident, claimant 20% at fault, fully-insured + auto med-pay.
  //   Main Wisconsin overlay showcase: made-whole + comp-neg + common-fund all populated.
  {
    id: "c004", memberId: "m004", tenant: "t_indie", caseState: "IN_RECOVERY",
    serviceDate: "2026-03-18", billedAmount: 64200.00, paidAmount: 38520.00,
    diagnosisCodes: ["S22.42XA", "S06.0X1A"], placeOfService: "21",
    providerSpecialty: "Trauma Surgery", accidentIndicator: "Y",
    accidentState: "WI", accidentDate: "2026-03-18",
    member: { id: "m004", firstName: "Hailey", lastName: "Brennan", dob: "1991-04-22", age: 34, relationship: "SELF" },
    coverages: [
      { id: "cov004a", planType: "HEALTH", payerName: "Anthem BCBS Wisconsin", basis: "ACTIVE_EMPLOYEE", funding: "FULLY_INSURED", hasCoordinationClause: true, effectiveDate: "2022-01-01" },
      { id: "cov004b", planType: "AUTO_MEDPAY", payerName: "American Family Med-Pay", basis: "INSURED", funding: "N/A", hasExcessClause: false, effectiveDate: "2024-06-01" },
    ],
    liability: { claimantFaultPct: 20, defendantFaultPct: 80, liabilityAccepted: true, attorneyOfRecord: "Brennan Law, S.C." },
    recovery: { totalMedicalPaid: 38520.00, totalSettlement: 95000.00, attorneyFee: 31666.67, planGrossRecovery: 38520.00 },
  },

  // c005 — WI member, single coverage.
  //   Exercises: INSUFFICIENT_DATA
  {
    id: "c005", memberId: "m005", tenant: "t_carrier", caseState: "READY",
    serviceDate: "2026-04-18", billedAmount: 980.00, paidAmount: 510.00,
    diagnosisCodes: ["J20.9"], placeOfService: "11",
    providerSpecialty: "Internal Medicine", accidentIndicator: "N",
    member: { id: "m005", firstName: "Priya", lastName: "Shah", dob: "1990-08-19", age: 35, relationship: "SELF" },
    coverages: [
      { id: "cov005a", planType: "HEALTH", payerName: "Lakeshore Health Plan (self-funded)", basis: "ACTIVE_EMPLOYEE", funding: "SELF_FUNDED", hasCoordinationClause: true, effectiveDate: "2020-01-01" },
    ],
  },

  // c006 — WI BadgerCare Plus + commercial health.
  //   Exercises: MEDICAID_PAYER_OF_LAST_RESORT
  {
    id: "c006", memberId: "m006", tenant: "t_vendor", caseState: "CLOSED",
    serviceDate: "2026-03-15", billedAmount: 7820.00, paidAmount: 4940.00,
    diagnosisCodes: ["S52.501A"], placeOfService: "23",
    providerSpecialty: "Emergency Medicine", accidentIndicator: "U",
    member: { id: "m006", firstName: "Davis", lastName: "Okafor", dob: "1988-11-02", age: 37, relationship: "SELF" },
    coverages: [
      { id: "cov006a", planType: "HEALTH", payerName: "Network Health", basis: "ACTIVE_EMPLOYEE", funding: "FULLY_INSURED", effectiveDate: "2024-01-01" },
      { id: "cov006b", planType: "MEDICAID", payerName: "BadgerCare Plus (WI Medicaid)", basis: "MEDICAID", funding: "N/A", effectiveDate: "2025-06-01" },
    ],
  },

  // c007 — WI ESRD, EGHP + Medicare in coordination period.
  //   Exercises: MSP_ESRD_COORDINATION
  {
    id: "c007", memberId: "m007", tenant: "t_carrier", caseState: "IN_RECOVERY",
    serviceDate: "2026-04-22", billedAmount: 31200.00, paidAmount: 18400.00,
    diagnosisCodes: ["N18.6", "Z99.2"], placeOfService: "11",
    providerSpecialty: "Nephrology", accidentIndicator: "N",
    member: { id: "m007", firstName: "Renata", lastName: "Holm", dob: "1968-07-30", age: 57, relationship: "SELF" },
    coverages: [
      { id: "cov007a", planType: "MEDICARE", payerName: "CMS Medicare", basis: "MEDICARE", funding: "N/A", effectiveDate: "2025-01-01", medicareReason: "ESRD", esrdMonthsElapsed: 14 },
      { id: "cov007b", planType: "HEALTH", payerName: "Lakeshore Health Plan (self-funded)", basis: "ACTIVE_EMPLOYEE", funding: "SELF_FUNDED", hasCoordinationClause: true, effectiveDate: "2019-01-01", employerSize: "L", employerHeadcount: 1100 },
    ],
  },

  // c008 — WI retiree, Medicare + TFL.
  //   Exercises: TFL_MEDICARE_PRIMARY
  {
    id: "c008", memberId: "m008", tenant: "t_indie", caseState: "REOPENED",
    serviceDate: "2026-05-01", billedAmount: 1840.00, paidAmount: 1320.00,
    diagnosisCodes: ["E11.9"], placeOfService: "11",
    providerSpecialty: "Endocrinology", accidentIndicator: "N",
    member: { id: "m008", firstName: "Glen", lastName: "Mathieu", dob: "1949-04-12", age: 76, relationship: "SELF" },
    coverages: [
      { id: "cov008a", planType: "MEDICARE", payerName: "CMS Medicare", basis: "MEDICARE", funding: "N/A", effectiveDate: "2014-04-01", medicareReason: "AGED" },
      { id: "cov008b", planType: "TFL", payerName: "TRICARE for Life", basis: "RETIREE", funding: "N/A", effectiveDate: "2014-05-01" },
    ],
  },

  // c009 — WI auto, claimant 60% at fault.
  //   Exercises: WI overlay 51% bar — recovery barred.
  {
    id: "c009", memberId: "m009", tenant: "t_indie", caseState: "ASSIGNED",
    serviceDate: "2026-04-04", billedAmount: 12800.00, paidAmount: 9100.00,
    diagnosisCodes: ["S52.501A"], placeOfService: "23",
    providerSpecialty: "Emergency Medicine", accidentIndicator: "Y",
    accidentState: "WI", accidentDate: "2026-04-04",
    member: { id: "m009", firstName: "Mason", lastName: "Doyle", dob: "1985-12-09", age: 40, relationship: "SELF" },
    coverages: [
      { id: "cov009a", planType: "HEALTH", payerName: "Common Ground Healthcare Cooperative", basis: "ACTIVE_EMPLOYEE", funding: "FULLY_INSURED", effectiveDate: "2023-01-01" },
      { id: "cov009b", planType: "AUTO_MEDPAY", payerName: "American Family Med-Pay", basis: "INSURED", funding: "N/A", effectiveDate: "2024-01-01" },
    ],
    liability: { claimantFaultPct: 60, defendantFaultPct: 40, liabilityAccepted: false, attorneyOfRecord: null },
    recovery: { totalMedicalPaid: 9100.00 },
  },

  // c010 — WI self-funded ERISA vs fully-insured spouse plan.
  //   Exercises: ERISA_SELF_FUNDED_PREEMPTION
  {
    id: "c010", memberId: "m010", tenant: "t_vendor", caseState: "IN_RECOVERY",
    serviceDate: "2026-04-25", billedAmount: 5300.00, paidAmount: 3200.00,
    diagnosisCodes: ["K35.80"], placeOfService: "22",
    providerSpecialty: "General Surgery", accidentIndicator: "N",
    member: { id: "m010", firstName: "Annika", lastName: "Larson", dob: "1979-10-05", age: 46, relationship: "SELF" },
    coverages: [
      { id: "cov010a", planType: "HEALTH", payerName: "Lakeshore Health Plan (self-funded)", basis: "ACTIVE_EMPLOYEE", funding: "SELF_FUNDED", hasCoordinationClause: true, hasEscapeClause: true, effectiveDate: "2018-01-01" },
      { id: "cov010b", planType: "HEALTH", payerName: "Quartz Health Plan", basis: "DEPENDENT_SPOUSE", funding: "FULLY_INSURED", effectiveDate: "2022-01-01" },
    ],
  },
];

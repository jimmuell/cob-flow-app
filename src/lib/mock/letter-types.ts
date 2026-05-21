import type { LetterTypeKey, LetterType, CorrespondenceStatusKey, CorrespondenceStatus } from "@/lib/types/correspondence";

export const LETTER_TYPES: Record<LetterTypeKey, LetterType> = {
  DEMAND:                  { label: "Demand for Reimbursement",        tier: 1, color: "bg-blue-100 text-blue-800" },
  COB_QUESTIONNAIRE:       { label: "COB Questionnaire",                tier: 1, color: "bg-violet-100 text-violet-800" },
  MEDICAL_RECORDS_REQUEST: { label: "Medical Records Request",          tier: 1, color: "bg-emerald-100 text-emerald-800" },
  LIEN_NOTICE:             { label: "Lien Notice",                      tier: 1, color: "bg-amber-100 text-amber-800" },
  MEMBER_RECOVERY_NOTICE:  { label: "Member Recovery Notice",           tier: 1, color: "bg-slate-100 text-slate-700" },
  FOLLOWUP_DEMAND:         { label: "Follow-up Demand",                 tier: 2, color: "bg-blue-100 text-blue-800" },
  SUBROGATION_HOLD:        { label: "Subrogation Hold",                 tier: 2, color: "bg-amber-100 text-amber-800" },
  LIEN_REDUCTION_OFFER:    { label: "Lien Reduction Offer",             tier: 2, color: "bg-violet-100 text-violet-800" },
  SETTLEMENT_ACK:          { label: "Settlement Acknowledgment",        tier: 2, color: "bg-emerald-100 text-emerald-800" },
};

export const CORRESPONDENCE_STATUS: Record<CorrespondenceStatusKey, CorrespondenceStatus> = {
  DRAFT:        { label: "Draft",        color: "bg-slate-100 text-slate-700" },
  SENT:         { label: "Sent",         color: "bg-blue-100 text-blue-800" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "bg-emerald-100 text-emerald-800" },
  SUPERSEDED:   { label: "Superseded",   color: "bg-amber-100 text-amber-900" },
  CLOSED:       { label: "Closed",       color: "bg-zinc-200 text-zinc-700" },
};

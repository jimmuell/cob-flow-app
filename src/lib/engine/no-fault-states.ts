// Wisconsin-only build: NO_FAULT_STATES intentionally empty.
// The no-fault PIP rule path remains in the codebase for Phase 3 expansion
// to MI/FL/NY/etc. but never fires in the Wisconsin build.
export const NO_FAULT_STATES: Set<string> = new Set([]);

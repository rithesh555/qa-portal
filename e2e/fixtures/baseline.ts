/**
 * The shared, read-only project every slot's lead, tester and viewer belong
 * to (built by tests/setup/baseline.setup.ts). Tests read it, never change it:
 * anything that writes uses its own project (see `newProject`).
 */
export const BASE = {
  key: "BASE",
  name: "E2E Baseline",
  releases: { shipped: "1.0", current: "1.1", next: "2.0" },
  suites: { checkout: "Checkout", accounts: "Accounts", signIn: "Sign in" },
  /** Active cases (excludes the archived one). */
  activeCases: 30,
  draftCases: 4,
  archivedCase: "Retired: pay by cheque",
  runs: {
    closed: "BASE-R-1",
    closedName: "Release 1.0 regression",
    open: "BASE-R-2",
    openName: "Release 1.1 regression",
  },
  defects: [
    {
      title: "Card declined message is blank",
      status: "new",
      severity: "critical",
    },
    {
      title: "Basket total ignores voucher",
      status: "open",
      severity: "major",
    },
    {
      title: "Password reset email delayed",
      status: "fixed",
      severity: "minor",
    },
    {
      title: "Typo on the sign-in page",
      status: "closed",
      severity: "trivial",
    },
  ],
} as const

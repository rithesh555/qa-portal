import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Users › Directory",
    label: "users",
    cases: [
      {
        id: "E2E-USERS-001",
        title: "Find a user by name or username",
        priority: "high",
        preconditions: "Signed in as an admin",
        steps: [
          [
            "Open Users and look at the status tabs",
            "Active, Deactivated, All",
          ],
          [
            "Search for a username",
            "Only matching people are listed, with @username and role",
          ],
        ],
      },
      {
        id: "E2E-USERS-002",
        title: "A search with no match says so",
        priority: "low",
        steps: [
          [
            "Search for a name nobody has",
            "No users match: Try another search or status.",
          ],
        ],
      },
      {
        id: "E2E-USERS-003",
        title: "Your own row is marked and can't be reset or deactivated",
        priority: "medium",
        type: "security",
        steps: [
          ["Find yourself in Users", "Your row says (you)"],
          ["Open its actions", "Only Edit; no Reset password or Deactivate"],
        ],
      },
    ],
  },
  {
    suite: "Users › Accounts",
    label: "users",
    cases: [
      {
        id: "E2E-USERS-004",
        title: "Create a user with a generated temporary password",
        priority: "critical",
        steps: [
          [
            "New user; fill name, username, email; select Generate",
            "The temporary password is filled in, in plain text",
          ],
          [
            "Create user",
            '"<name> can now sign in"; the person is listed as Member, Active',
          ],
        ],
      },
      {
        id: "E2E-USERS-005",
        title: "New user checks every field",
        priority: "high",
        steps: [
          [
            "Create user with everything empty",
            "Enter a name; usernames are at least 3 characters; enter a valid email; passwords are at least 12 characters",
          ],
          [
            "Enter a username with a space",
            "Use letters, digits, dots and underscores only",
          ],
        ],
      },
      {
        id: "E2E-USERS-006",
        title: "A username that's taken is refused",
        priority: "high",
        steps: [
          [
            "Create a user with an existing username",
            "That username is already taken",
          ],
        ],
      },
      {
        id: "E2E-USERS-007",
        title: "Edit a user's name, email and portal role",
        priority: "high",
        steps: [
          [
            "Actions › Edit; change name, email and role to Admin; Save changes",
            '"Saved changes to <name>"',
          ],
          ["Look at the row", "New name and email; role Admin"],
        ],
      },
      {
        id: "E2E-USERS-008",
        title: "A new user is created as an admin when asked",
        priority: "medium",
        type: "security",
        steps: [
          ["New user with Portal role Admin", "Listed with the Admin role"],
        ],
      },
    ],
  },
  {
    suite: "Users › Access",
    label: "users",
    cases: [
      {
        id: "E2E-USERS-009",
        title: "Reset someone's password; they must choose their own next",
        priority: "critical",
        type: "security",
        steps: [
          [
            "Actions › Reset password; Generate; Set password",
            '"New password set for <name>"; they\'re signed out everywhere',
          ],
          [
            "They sign in with the new password",
            '"Choose your own password" appears',
          ],
        ],
      },
      {
        id: "E2E-USERS-010",
        title: "Deactivate someone after confirming",
        priority: "critical",
        type: "security",
        steps: [
          [
            "Actions › Deactivate",
            '"Deactivate <name>?" explains their history stays',
          ],
          [
            "Confirm",
            '"<name> has been deactivated"; they leave the Active tab and show as Deactivated in that tab',
          ],
        ],
      },
      {
        id: "E2E-USERS-011",
        title: "Reactivate someone and they can sign in again",
        priority: "high",
        steps: [
          [
            "In Deactivated, Actions › Reactivate",
            '"<name> can sign in again"',
          ],
          ["They sign in", "Home opens"],
        ],
      },
      {
        id: "E2E-USERS-012",
        title: "Create a user on a phone",
        priority: "low",
        type: "usability",
        steps: [
          [
            "At phone width, create a user",
            "The dialog fits the screen and the user is created",
          ],
        ],
      },
    ],
  },
]

export default suites

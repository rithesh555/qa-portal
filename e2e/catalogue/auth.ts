import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Auth › Sign in",
    label: "auth",
    cases: [
      {
        id: "E2E-AUTH-001",
        title: "Sign in with a valid username and password",
        priority: "critical",
        preconditions: "An active account; signed out",
        steps: [
          [
            "Open /login, enter the username and password, select Sign in",
            "Home opens",
          ],
          ["Open the user menu", "It shows the person's name and @username"],
        ],
      },
      {
        id: "E2E-AUTH-002",
        title: "A wrong password is refused and the password field is cleared",
        priority: "high",
        type: "security",
        steps: [
          [
            "Sign in with the right username and a wrong password",
            "\"Couldn't sign in\": the username and password don't match",
          ],
          [
            "Look at the form",
            "The password is cleared and focused; the username is kept",
          ],
        ],
      },
      {
        id: "E2E-AUTH-003",
        title: "Empty fields show what to fill in",
        priority: "medium",
        steps: [
          [
            "Select Sign in with both fields empty",
            "Usernames are at least 3 characters; Enter your password",
          ],
        ],
      },
      {
        id: "E2E-AUTH-004",
        title: "A deactivated account can't sign in",
        priority: "critical",
        type: "security",
        preconditions: "A deactivated account",
        steps: [
          [
            "Sign in with its correct password",
            "This account has been deactivated. Ask an admin to restore access.",
          ],
        ],
      },
      {
        id: "E2E-AUTH-005",
        title: "A deep link while signed out returns there after sign-in",
        priority: "high",
        steps: [
          ["Signed out, open /projects/BASE/cases", "The sign-in screen opens"],
          ["Sign in", "Test cases of E2E Baseline open"],
        ],
      },
      {
        id: "E2E-AUTH-006",
        title: "Signed-in people opening /login go to Home",
        priority: "low",
        steps: [["Signed in, open /login", "Home opens"]],
      },
      {
        id: "E2E-AUTH-007",
        title: "Too many sign-in attempts are slowed down with a clear message",
        priority: "high",
        type: "security",
        preconditions:
          "30 failed sign-ins from this address in the last minute",
        steps: [
          [
            "Try to sign in once more",
            "Too many sign-in attempts. Wait a minute, then try again.",
          ],
        ],
      },
    ],
  },
  {
    suite: "Auth › Session",
    label: "auth",
    cases: [
      {
        id: "E2E-AUTH-008",
        title: "Sign out ends the session",
        priority: "critical",
        type: "security",
        steps: [
          ["User menu › Sign out", "The sign-in screen opens"],
          [
            "Go back in the browser, then reload",
            "Still the sign-in screen; nothing from the app shows",
          ],
        ],
      },
      {
        id: "E2E-AUTH-009",
        title: "Deactivating someone signs them out on their next action",
        priority: "critical",
        type: "security",
        preconditions: "The person is signed in",
        steps: [
          ["An admin deactivates them", "—"],
          ["They open another page", "They're sent to the sign-in screen"],
        ],
      },
    ],
  },
  {
    suite: "Auth › Passwords",
    label: "auth",
    cases: [
      {
        id: "E2E-AUTH-010",
        title:
          "A new account must choose its own password before anything else",
        priority: "critical",
        type: "security",
        preconditions: "An admin just created the account",
        steps: [
          [
            "Sign in with the admin-set password",
            '"Choose your own password" covers the app',
          ],
          ["Press Escape or click outside", "The dialog stays"],
          ["Ask the API for projects", "403: change your password first"],
        ],
      },
      {
        id: "E2E-AUTH-011",
        title: "Choosing a password checks it differs and is confirmed",
        priority: "high",
        steps: [
          [
            "Enter the current password as the new one",
            "Choose a password different from your current one",
          ],
          ["Enter a different confirmation", "The passwords don't match"],
        ],
      },
      {
        id: "E2E-AUTH-012",
        title:
          "After choosing a password the app opens and the new password works",
        priority: "critical",
        steps: [
          ["Save a valid new password", '"Password saved"; Home opens'],
          [
            "Sign out and sign in with the new password",
            "Home opens without the dialog",
          ],
        ],
      },
      {
        id: "E2E-AUTH-013",
        title: "Sign out from the choose-password dialog",
        priority: "medium",
        steps: [["Select Sign out in the dialog", "The sign-in screen opens"]],
      },
      {
        id: "E2E-AUTH-014",
        title: "Change password refuses a wrong current password",
        priority: "high",
        type: "security",
        steps: [
          [
            "User menu › Change password; enter a wrong current password",
            "Your current password isn't right, under Current password, which is cleared, marked invalid and focused",
          ],
        ],
      },
      {
        id: "E2E-AUTH-015",
        title: "Changing the password signs out other devices",
        priority: "high",
        type: "security",
        preconditions: "Signed in on two browsers",
        steps: [
          ["Change the password on one", '"Password changed"'],
          ["Reload the other", "It's on the sign-in screen"],
        ],
      },
    ],
  },
]

export default suites

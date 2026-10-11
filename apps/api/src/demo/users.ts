import type { CreateUserInput } from "@qa/shared"

/** Fixed accounts for walkthroughs; their project roles are seeded with projects. */
export const DEMO_ACCOUNTS = [
  "demo.admin",
  "demo.lead",
  "demo.tester",
  "demo.viewer",
] as const

const FIRST = [
  "Aarav",
  "Priya",
  "Liam",
  "Sofia",
  "Noah",
  "Mei",
  "Lucas",
  "Amara",
  "Ethan",
  "Zara",
  "Omar",
  "Hana",
  "Mateo",
  "Ines",
  "Ravi",
  "Chloe",
  "Kofi",
  "Elena",
  "Yusuf",
  "Freya",
] as const

const LAST = [
  "Shah",
  "Nguyen",
  "Okafor",
  "Rossi",
  "Kim",
  "Fischer",
  "Silva",
  "Haddad",
  "Iyer",
  "Novak",
  "Mensah",
  "Tanaka",
  "Larsen",
  "Costa",
  "Rahman",
] as const

export interface DemoUser extends CreateUserInput {
  deactivated: boolean
}

/**
 * 100 deterministic demo people: the four named accounts plus 96 generated
 * names. Every 15th generated person is deactivated, like staff who left.
 */
export function demoUsers(password: string): DemoUser[] {
  const named: DemoUser[] = DEMO_ACCOUNTS.map((username) => {
    const label = username.split(".")[1]!
    return {
      username,
      name: `Demo ${label[0]!.toUpperCase()}${label.slice(1)}`,
      email: `${username}@demo.qa-portal.local`,
      password,
      role: username === "demo.admin" ? "admin" : "user",
      deactivated: false,
    }
  })

  const generated: DemoUser[] = []
  for (let i = 0; generated.length < 100 - named.length; i++) {
    const first = FIRST[i % FIRST.length]!
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]!
    const username = `${first}.${last}`.toLowerCase()
    generated.push({
      username,
      name: `${first} ${last}`,
      email: `${username}@demo.qa-portal.local`,
      password,
      role: "user",
      deactivated: (i + 1) % 15 === 0,
    })
  }
  return [...named, ...generated]
}

import { describe, expect, it } from "vitest"
import { z } from "zod"
import { listQuerySchema, MAX_PAGE_SIZE, pageSchema } from "./list.ts"

const query = listQuerySchema(["name", "createdAt"])

describe("listQuerySchema", () => {
  it("applies defaults", () => {
    expect(query.parse({})).toEqual({
      page: 1,
      pageSize: 25,
      sort: "name",
      order: "asc",
    })
  })

  it("coerces query-string numbers", () => {
    expect(query.parse({ page: "3", pageSize: "50" })).toMatchObject({
      page: 3,
      pageSize: 50,
    })
  })

  it("rejects pages below 1 and page sizes above the cap", () => {
    expect(query.safeParse({ page: "0" }).success).toBe(false)
    expect(
      query.safeParse({ pageSize: String(MAX_PAGE_SIZE + 1) }).success
    ).toBe(false)
  })

  it("only allows whitelisted sort fields", () => {
    expect(query.parse({ sort: "createdAt", order: "desc" })).toMatchObject({
      sort: "createdAt",
      order: "desc",
    })
    expect(query.safeParse({ sort: "password" }).success).toBe(false)
  })

  it("trims the search term and drops it when blank", () => {
    expect(query.parse({ q: "  ali  " }).q).toBe("ali")
    expect(query.parse({ q: "   " }).q).toBeUndefined()
  })

  it("caps the search term length", () => {
    expect(query.safeParse({ q: "x".repeat(101) }).success).toBe(false)
  })
})

describe("pageSchema", () => {
  it("wraps items with paging info", () => {
    const schema = pageSchema(z.object({ id: z.string() }))
    const page = { items: [{ id: "a" }], total: 1, page: 1, pageSize: 25 }
    expect(schema.parse(page)).toEqual(page)
  })
})

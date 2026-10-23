import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/api"
import { isEditConflict } from "./conflict-alert"

describe("isEditConflict", () => {
  it("is only a stale-version 409", () => {
    expect(isEditConflict(new ApiError(409, "x changed it", "stale"))).toBe(
      true
    )
    // A closed run or an archived project is a 409 too, but saving again won't help.
    expect(isEditConflict(new ApiError(409, "This run is closed"))).toBe(false)
    expect(isEditConflict(new ApiError(412, "x", "stale"))).toBe(false)
  })
})

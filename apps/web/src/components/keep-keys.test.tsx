import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { KeepKeys } from "./keep-keys"

describe("KeepKeys", () => {
  it("keeps each ID on one line and leaves the text unchanged", () => {
    const text = "linked BASE-D-4 to BASE-TC-12 in BASE-R-3"
    const { container } = render(<KeepKeys text={text} />)
    expect(container.textContent).toBe(text)
    const whole = [...container.querySelectorAll(".whitespace-nowrap")].map(
      (el) => el.textContent
    )
    expect(whole).toEqual(["BASE-D-4", "BASE-TC-12", "BASE-R-3"])
  })

  it("leaves text without IDs alone", () => {
    const { container } = render(<KeepKeys text="renamed the project" />)
    expect(container.querySelector(".whitespace-nowrap")).toBeNull()
  })
})

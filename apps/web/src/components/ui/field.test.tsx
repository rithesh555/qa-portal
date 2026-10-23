import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Field, FieldError, FieldLabel } from "./field"
import { Input } from "./input"
import { Textarea } from "./textarea"

describe("Field", () => {
  it("ties an invalid control to its error message", () => {
    render(
      <>
        <Field data-invalid>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" aria-invalid />
          <FieldError errors={[{ message: "Give it a title" }]} />
        </Field>
        <Field data-invalid>
          <FieldLabel htmlFor="steps">Steps</FieldLabel>
          <Textarea id="steps" aria-invalid />
          <FieldError errors={[{ message: "Add at least one step" }]} />
        </Field>
      </>
    )
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
      "Give it a title"
    )
    expect(screen.getByLabelText("Steps")).toHaveAccessibleDescription(
      "Add at least one step"
    )
  })

  it("adds no description while the control is valid", () => {
    render(
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" />
      </Field>
    )
    expect(screen.getByLabelText("Name")).not.toHaveAttribute(
      "aria-describedby"
    )
  })

  it("keeps a description the caller set", () => {
    render(
      <Field data-invalid>
        <FieldLabel htmlFor="key">Key</FieldLabel>
        <Input id="key" aria-invalid aria-describedby="key-hint" />
        <p id="key-hint">2–6 letters</p>
        <FieldError errors={[{ message: "Too long" }]} />
      </Field>
    )
    expect(screen.getByLabelText("Key")).toHaveAccessibleDescription(
      "2–6 letters Too long"
    )
  })
})

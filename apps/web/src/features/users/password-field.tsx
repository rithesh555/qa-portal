import { RefreshCwIcon } from "lucide-react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { generatePassword } from "./generate-password"

/**
 * A password an admin sets for someone else. Shown in plain text so it can
 * be copied and handed over; "Generate" fills in a strong random one.
 */
export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
}) {
  const id = `user-${name}`
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              {...field}
              id={id}
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono"
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={() =>
                  field.onChange(generatePassword() as typeof field.value)
                }
              >
                <RefreshCwIcon />
                Generate
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            At least 12 characters. Share it with them securely; they can change
            it after signing in.
          </FieldDescription>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

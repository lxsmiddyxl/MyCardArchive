import type { Meta, StoryObj } from "@storybook/react";
import { Field, Input } from "@/mca-ui";

const meta = {
  title: "MCA-UI/Field",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `space-y-mca-micro`, label `text-mca-ink-subtle`, hint `text-mca-hint`, error `text-mca-error-accent`. **A11y:** `<label htmlFor>`; error uses `role=\"alert\"`; wire input `aria-describedby` to hint/error ids in app code.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHint: Story = {
  render: () => (
    <div className="max-w-md">
      <Field id="story-email" label="Email" hint="We never share your email.">
        <Input id="story-email" type="email" autoComplete="email" aria-describedby="story-email-hint" />
      </Field>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="max-w-md">
      <Field id="story-name" label="Display name" error="This field is required.">
        <Input id="story-name" aria-invalid aria-describedby="story-name-error" />
      </Field>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-md">
      <Field id="story-x" label="Locked" disabled>
        <Input id="story-x" disabled />
      </Field>
    </div>
  ),
};

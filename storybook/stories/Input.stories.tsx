import type { Meta, StoryObj } from "@storybook/react";
import { Input, mcaInputClassName } from "@/mca-ui";
import { cn } from "@/lib/ui/cn";

const meta = {
  title: "MCA-UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `mca-input` + `border-mca-border-subtle`, `bg-mca-surface-elevated`, `text-mca-ink-strong` via `mcaInputClassName`. **A11y:** always pair with a visible label (e.g. `Field`).",
      },
    },
  },
  argTypes: {
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
  },
  args: {
    placeholder: "Search cards…",
    disabled: false,
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithTextareaMirror: Story = {
  name: "Textarea (mcaInputClassName)",
  render: () => (
    <textarea
      className={cn(mcaInputClassName, "min-h-24 w-full max-w-md")}
      placeholder="Notes"
      aria-label="Notes"
    />
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { InlineError } from "@/mca-ui";

const meta = {
  title: "MCA-UI/InlineError",
  component: InlineError,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `rounded-mca-block`, `gap-mca-sm`, `px-mca-compact`, `py-mca-tight`, error border/surface/text. **A11y:** `role=\"alert\"`; optional `id` for `aria-describedby`.",
      },
    },
  },
  argTypes: {
    showIcon: { control: "boolean" },
  },
  args: {
    children: "Something went wrong. Try again in a moment.",
    showIcon: true,
  },
} satisfies Meta<typeof InlineError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const TextOnly: Story = {
  args: {
    showIcon: false,
    children: "Plain message without icon.",
  },
};

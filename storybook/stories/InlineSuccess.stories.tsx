import type { Meta, StoryObj } from "@storybook/react";
import { InlineSuccess } from "@/mca-ui";

const meta = {
  title: "MCA-UI/InlineSuccess",
  component: InlineSuccess,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `rounded-mca-block`, success border/surface/ink. **A11y:** `role=\"status\"` (polite updates).",
      },
    },
  },
  argTypes: {
    showIcon: { control: "boolean" },
  },
  args: {
    children: "Binder saved.",
    showIcon: true,
  },
} satisfies Meta<typeof InlineSuccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

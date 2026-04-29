import type { Meta, StoryObj } from "@storybook/react";
import { ChartContainer } from "@/mca-ui";

const meta = {
  title: "MCA-UI/ChartContainer",
  component: ChartContainer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `rounded-mca-block`, `border-mca-border-subtle`, `bg-mca-surface-elevated/60`, `p-mca-md`, `shadow-mca-panel`. **A11y:** add a chart title or `figure`/`figcaption`; this div is presentational framing only.",
      },
    },
  },
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "flex min-h-[200px] items-center justify-center",
    children: (
      <span className="text-mca-hint text-sm">Chart placeholder</span>
    ),
  },
};

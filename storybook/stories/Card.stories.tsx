import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "@/mca-ui";

const meta = {
  title: "MCA-UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `rounded-mca-block`, `border-mca-border`, `shadow-mca-panel`, `duration-200`, `ease-mca-standard`; `elevated` adds `hover:shadow-mca-card`. **A11y:** if the whole card is interactive, use a named control or `aria-label`.",
      },
    },
  },
  argTypes: {
    elevated: { control: "boolean" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "p-mca-md",
    children: (
      <div>
        <p className="text-mca-caption text-mca-hint">Total cards</p>
        <p className="text-mca-h2 text-mca-ink-strong">1,240</p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    elevated: true,
    className: "p-mca-md",
    children: <p className="text-mca-ink-body">Hover to see shadow lift.</p>,
  },
};

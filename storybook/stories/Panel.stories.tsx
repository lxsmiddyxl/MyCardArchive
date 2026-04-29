import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "@/mca-ui";

const meta = {
  title: "MCA-UI/Panel",
  component: Panel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `.mca-panel`, default `p-mca-md`; `elevated` → `shadow-mca-card`. **A11y:** add headings inside for major blocks.",
      },
    },
  },
  argTypes: {
    elevated: { control: "boolean" },
  },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p className="text-mca-ink-body">
        Panel content uses the shared shell from globals (`.mca-panel`).
      </p>
    ),
  },
};

export const Elevated: Story = {
  args: {
    elevated: true,
    children: (
      <p className="text-mca-ink-body">
        Elevated surface for stronger hierarchy on the same page.
      </p>
    ),
  },
};

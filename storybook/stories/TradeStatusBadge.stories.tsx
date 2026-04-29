import type { Meta, StoryObj } from "@storybook/react";
import type { TradeStatus } from "@/lib/trading/types";
import { TradeStatusBadge } from "@/mca-ui";

const STATUSES: TradeStatus[] = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "countered",
  "completed",
];

const meta = {
  title: "MCA-UI/TradeStatusBadge",
  component: TradeStatusBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `rounded-mca-control`, `px-mca-sm`, `py-mca-xs`, `text-mca-caption`, per-status borders/surfaces from `STATUS_STYLES`. **A11y:** visible text is the enum string; pair with user-friendly copy elsewhere if needed.",
      },
    },
  },
  argTypes: {
    status: { control: "select", options: STATUSES },
  },
  args: {
    status: "sent",
  },
} satisfies Meta<typeof TradeStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllStatuses: Story = {
  name: "All statuses",
  render: () => (
    <div className="flex flex-wrap gap-mca-md">
      {STATUSES.map((s) => (
        <TradeStatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};

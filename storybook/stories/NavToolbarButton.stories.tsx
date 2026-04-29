import type { Meta, StoryObj } from "@storybook/react";
import { Icon, NavToolbarButton } from "@/mca-ui";

const meta = {
  title: "MCA-UI/NavToolbarButton",
  component: NavToolbarButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** global `mca-header-toolbar-control`. **A11y:** icon-only triggers must set `aria-label` on the button (not the icon `alt`).",
      },
    },
  },
} satisfies Meta<typeof NavToolbarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IconOnly: Story = {
  args: {
    type: "button",
    children: <Icon src="/icons/activity/bell.svg" alt="" size="md" />,
    "aria-label": "Notifications",
  },
};

export const WithText: Story = {
  args: {
    type: "button",
    children: (
      <span className="flex items-center gap-mca-sm text-sm font-medium">
        <Icon src="/icons/ui/search.svg" alt="" size="sm" />
        Search
      </span>
    ),
  },
};

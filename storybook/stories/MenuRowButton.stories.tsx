import type { Meta, StoryObj } from "@storybook/react";
import { MenuRowButton } from "@/mca-ui";

const meta = {
  title: "MCA-UI/MenuRowButton",
  component: MenuRowButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** full width, `rounded-mca-control`, `px-mca-compact`, `py-mca-sm`, focus ring `ring-mca-focus/50`, danger hover `text-mca-error-text`. **A11y:** `role=\"menuitem\"` — use inside `NavDropdown`’s `role=\"menu\"`.",
      },
    },
  },
  argTypes: {
    variant: { control: "select", options: ["default", "danger"] },
  },
} satisfies Meta<typeof MenuRowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultVariant: Story = {
  args: {
    type: "button",
    variant: "default",
    children: "Settings",
  },
};

export const Danger: Story = {
  args: {
    type: "button",
    variant: "danger",
    children: "Sign out",
  },
};

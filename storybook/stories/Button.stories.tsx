import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/mca-ui";

const meta = {
  title: "MCA-UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `rounded-mca-control`, `gap-mca-sm`, `px-mca-compact`, `py-mca-sm`, `duration-200`, `ease-mca-standard`, `ring-offset-mca-surface`, semantic accent/chrome/error surfaces. **A11y:** native `<button>`; pair destructive actions with confirmation in product.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "destructive"],
    },
    disabled: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    children: "Save changes",
    variant: "primary",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllVariants: Story = {
  name: "All variants",
  render: () => (
    <div className="flex flex-wrap gap-mca-md">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    disabled: true,
    children: "Disabled",
  },
};

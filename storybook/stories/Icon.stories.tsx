import type { Meta, StoryObj } from "@storybook/react";
import { Icon } from "@/mca-ui";

const meta = {
  title: "MCA-UI/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** size maps to fixed `h-* w-*` + pixel `width`/`height` on `next/image`. **A11y:** empty `alt` → decorative (`aria-hidden`); non-empty `alt` for standalone meaning.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    src: { control: "text" },
    alt: { control: "text" },
  },
  args: {
    src: "/icons/ui/check.svg",
    size: "md",
    alt: "",
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-mca-md">
      <Icon src="/icons/ui/check.svg" size="sm" alt="" />
      <Icon src="/icons/ui/check.svg" size="md" alt="" />
      <Icon src="/icons/ui/check.svg" size="lg" alt="" />
    </div>
  ),
};

export const MeaningfulAlt: Story = {
  args: {
    src: "/icons/system/alert.svg",
    size: "md",
    alt: "Warning",
  },
};

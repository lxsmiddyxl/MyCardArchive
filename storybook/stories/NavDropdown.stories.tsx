"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { MenuRowButton, NavDropdown, NavDropdownLink } from "@/mca-ui";

const meta = {
  title: "MCA-UI/NavDropdown",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** trigger `mca-header-toolbar-control`; menu `rounded-mca-card`, `border-mca-border-subtle`, `bg-mca-surface`, `shadow-mca-card`, `py-mca-micro`. **A11y:** `aria-expanded`, `role=\"menu\"`, menuitems focusable; provide `ariaLabel` for icon-only triggers.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex justify-center pt-mca-lg">
      <NavDropdown trigger={<span className="truncate">Account</span>} align="left">
        <NavDropdownLink href="/profile">Profile</NavDropdownLink>
        <NavDropdownLink href="/settings">Settings</NavDropdownLink>
        <MenuRowButton type="button" variant="danger" onClick={() => undefined}>
          Sign out
        </MenuRowButton>
      </NavDropdown>
    </div>
  ),
};

export const AlignRight: Story = {
  render: () => (
    <div className="flex justify-end pt-mca-lg">
      <NavDropdown trigger={<span>Menu</span>} align="right" menuClassName="min-w-[12rem]">
        <NavDropdownLink href="/">Home</NavDropdownLink>
        <NavDropdownLink href="/collection">Collection</NavDropdownLink>
      </NavDropdown>
    </div>
  ),
};

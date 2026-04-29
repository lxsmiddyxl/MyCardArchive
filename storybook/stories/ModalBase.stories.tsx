"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button, ModalBase } from "@/mca-ui";

const meta = {
  title: "MCA-UI/ModalBase",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** overlay `bg-black/65`, panel `rounded-mca-card`, `border-mca-border`, `bg-mca-surface-elevated/95`, `shadow-mca-card`, padding `p-mca-md` / `px-mca-lg`. **A11y:** `role=\"dialog\"`, `aria-modal`; requires `title` or `ariaLabel`; focus trap and restore focus on close.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <ModalBase isOpen={open} onClose={() => setOpen(false)} title="Confirm action">
        <p className="p-mca-md text-mca-ink-body">
          Dialog body scrolls inside the panel. Escape and backdrop close unless{" "}
          <code className="text-mca-caption">blockClose</code> is set.
        </p>
      </ModalBase>
    </div>
  );
}

function ModalWithFooterDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Open with footer
      </Button>
      <ModalBase
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit profile"
        footer={
          <>
            <Button type="button" variant="tertiary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={() => setOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <p className="p-mca-md text-mca-ink-body">Footer slots for primary actions.</p>
      </ModalBase>
    </div>
  );
}

export const Default: Story = {
  render: () => <ModalDemo />,
};

export const WithFooter: Story = {
  render: () => <ModalWithFooterDemo />,
};

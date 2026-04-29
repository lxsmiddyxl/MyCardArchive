"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/mca-ui";

const meta = {
  title: "MCA-UI/AnimatedNumber",
  component: AnimatedNumber,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** typography comes from `className` / parent (use `tabular-nums` for dashboards). Animation duration default `550ms`. **A11y:** presentation-only; add live-region semantics in feature code if values must be announced.",
      },
    },
  },
  argTypes: {
    value: { control: { type: "number" } },
    durationMs: { control: { type: "number" } },
  },
  args: {
    value: 2048,
    durationMs: 550,
    className: "tabular-nums text-3xl font-semibold text-mca-ink-strong",
  },
} satisfies Meta<typeof AnimatedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const SteppedDemo: Story = {
  name: "Value changes (demo)",
  render: function Stepped() {
    const [v, setV] = useState(100);
    useEffect(() => {
      const id = window.setInterval(() => {
        setV((n) => (n >= 500 ? 100 : n + 100));
      }, 2000);
      return () => window.clearInterval(id);
    }, []);
    return (
      <p className="text-mca-ink-body">
        <AnimatedNumber value={v} className="tabular-nums text-3xl font-semibold text-mca-ink-strong" />
      </p>
    );
  },
};

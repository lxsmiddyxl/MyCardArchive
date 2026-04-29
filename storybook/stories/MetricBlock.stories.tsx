import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedNumber, MetricBlock, MetricGrid } from "@/mca-ui";

const meta = {
  title: "MCA-UI/MetricBlock",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** grid `gap-mca-md`; tiles `rounded-mca-block`, `border-mca-border`, `px-mca-comfortable`, `py-mca-md`, `shadow-mca-panel`, `hover:shadow-mca-card`, label `text-mca-ink-subtle`. **A11y:** semantic `<ul>` / `<li>` list of related metrics.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {
  render: () => (
    <MetricGrid>
      <MetricBlock label="Cards tracked">
        <p className="text-2xl font-semibold tabular-nums text-mca-ink-strong">
          <AnimatedNumber value={1284} />
        </p>
      </MetricBlock>
      <MetricBlock label="Sets" revealClassName="mca-section-reveal-delay-1">
        <p className="text-2xl font-semibold tabular-nums text-mca-ink-strong">42</p>
      </MetricBlock>
      <MetricBlock label="Decks" revealClassName="mca-section-reveal-delay-2">
        <p className="text-2xl font-semibold tabular-nums text-mca-ink-strong">7</p>
      </MetricBlock>
    </MetricGrid>
  ),
};

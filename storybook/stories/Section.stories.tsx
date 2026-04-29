import type { Meta, StoryObj } from "@storybook/react";
import { Panel, SectionShell } from "@/mca-ui";

const meta = {
  title: "MCA-UI/SectionShell",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** `mca-section-reveal`, `space-y-mca-base`, section title uses hint/ink tokens. **A11y:** with both `title` and `sectionId`, the section gets `aria-labelledby` pointing at `${sectionId}-heading`.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTitleAndId: Story = {
  name: "Title + sectionId",
  render: () => (
    <SectionShell title="Collection" sectionId="story-collection">
      <Panel>
        <p className="text-mca-ink-body">Section body inside a panel.</p>
      </Panel>
    </SectionShell>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <SectionShell title="Settings">
      <p className="text-mca-ink-body">No section id — no aria-labelledby on the section.</p>
    </SectionShell>
  ),
};

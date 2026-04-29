import type { Meta, StoryObj } from "@storybook/react";
import { Card, RemoteCardThumb } from "@/mca-ui";

const SAMPLE =
  "https://images.pokemontcg.io/base1/4_hires.png";

const meta = {
  title: "MCA-UI/RemoteCardThumb",
  component: RemoteCardThumb,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** wrapper supplies radius/border; thumb uses `object-cover` by default. Supabase URLs use optimized `next/image`; other hosts use `unoptimized`. **A11y:** always pass meaningful `alt` (card name + set).",
      },
    },
  },
} satisfies Meta<typeof RemoteCardThumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InCard: Story = {
  args: {
    src: SAMPLE,
    alt: "Charizard · Base Set",
    sizes: "200px",
    priority: true,
  },
  render: (args) => (
    <Card className="relative w-48 overflow-hidden">
      <div className="relative aspect-[63/88] w-full">
        <RemoteCardThumb {...args} />
      </div>
    </Card>
  ),
};

export const Playground: Story = {
  render: (args) => (
    <div className="relative h-80 w-56">
      <RemoteCardThumb {...args} />
    </div>
  ),
  args: {
    src: SAMPLE,
    alt: "Charizard · Base Set",
    sizes: "224px",
  },
};

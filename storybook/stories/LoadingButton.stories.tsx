import type { Meta, StoryObj } from "@storybook/react";
import { Button, LoadingButton } from "@/mca-ui";
import { STORY_PRIMARY_BUTTON_CLASS } from "../lib/story-button-classes";

const meta = {
  title: "MCA-UI/LoadingButton",
  component: LoadingButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "**Tokens:** inherits whatever you pass via `className` (mirror `Button` classes in app). Spinner uses `duration-200`, `ease-mca-standard`. **A11y:** screen reader “Loading” text when busy; combine with `aria-busy` in product if needed.",
      },
    },
  },
  argTypes: {
    isLoading: { control: "boolean" },
  },
  args: {
    children: "Save changes",
    isLoading: false,
    className: STORY_PRIMARY_BUTTON_CLASS,
    type: "button",
  },
} satisfies Meta<typeof LoadingButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const NextToPrimaryButton: Story = {
  name: "Next to Button (visual match)",
  render: () => (
    <div className="flex flex-wrap items-center gap-mca-md">
      <Button variant="primary" type="button">
        Reference
      </Button>
      <LoadingButton className={STORY_PRIMARY_BUTTON_CLASS} isLoading type="button">
        Saving…
      </LoadingButton>
    </div>
  ),
};

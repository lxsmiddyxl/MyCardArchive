import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
    a11y: {
      config: {},
      options: {
        checks: { "color-contrast": { options: { noScroll: true } } },
      },
    },
    backgrounds: { disable: true },
  },
  decorators: [
    (Story) => (
      <div className="dark min-h-screen bg-mca-surface p-mca-md text-mca-ink-body antialiased">
        <Story />
      </div>
    ),
  ],
};

export default preview;

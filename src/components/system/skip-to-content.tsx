export function SkipToContent() {
  return (
    <a
      href="#mca-main-content"
      className="pointer-events-none fixed left-mca-base top-mca-base z-[100] -translate-y-[120%] rounded-mca-card border border-mca-border bg-mca-surface-elevated px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-accent-strong opacity-0 shadow-mca-panel outline-none transition duration-200 ease-mca-standard focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-mca-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface"
    >
      Skip to main content
    </a>
  );
}

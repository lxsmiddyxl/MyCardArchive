export default function PublicDeckShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mca-public-deck-shell mca-section-reveal min-h-[calc(100vh-5rem)] rounded-mca-sheet border border-mca-border-light bg-white px-mca-base py-mca-xl text-mca-surface-elevated shadow-mca-card transition-colors duration-200 ease-mca-standard dark:border-mca-border dark:bg-mca-surface dark:text-mca-ink-strong sm:px-mca-xl">
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}

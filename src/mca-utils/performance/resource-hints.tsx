/**
 * Preconnect / DNS-prefetch for Supabase storage and Pokémon TCG images.
 */
export function PerformanceResourceHints() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  let supabaseHost: string | null = null;
  if (supabaseUrl) {
    try {
      supabaseHost = new URL(supabaseUrl).origin;
    } catch {
      supabaseHost = null;
    }
  }

  return (
    <>
      {supabaseHost ? (
        <>
          <link rel="dns-prefetch" href={supabaseHost} />
          <link rel="preconnect" href={supabaseHost} crossOrigin="anonymous" />
        </>
      ) : null}
      <link rel="dns-prefetch" href="https://images.pokemontcg.io" />
      <link rel="preconnect" href="https://images.pokemontcg.io" crossOrigin="anonymous" />
    </>
  );
}

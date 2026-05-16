import type { ReactNode } from "react";

export default function FeaturesLayout({ children }: { children: ReactNode }) {
  return <div className="py-mca-lg">{children}</div>;
}

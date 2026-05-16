import { BinderExplorePage } from "@/mca-ui/binder/BinderExplorePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore binders",
  description: "Discover public binders shared by collectors on MyCardArchive.",
};

export default function ExploreBindersRoute() {
  return (
    <div className="py-mca-lg">
      <BinderExplorePage />
    </div>
  );
}

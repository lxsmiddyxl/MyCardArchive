import { InviteRedeemPage } from "@/mca-ui/invites/InviteRedeemPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invite code · MyCardArchive",
  description: "Redeem your MyCardArchive early-access invite code.",
  robots: { index: false, follow: false },
};

export default function InvitePage() {
  return <InviteRedeemPage />;
}

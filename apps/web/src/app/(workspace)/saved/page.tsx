import Link from "next/link";
import { ArrowUpRight, BookmarkCheck } from "lucide-react";
import { SavedMarketsManager } from "@/components/workspace/saved-markets-manager";

export const metadata = { title: "Saved Markets | PrigenFi" };
export default function SavedMarketsPage() {
  return (
    <div className="workspace-page saved-markets-page">
      <div className="ws-page-heading">
        <div>
          <p className="ws-kicker">
            <BookmarkCheck size={14} /> Wallet-owned research
          </p>
          <h1>Your saved markets.</h1>
          <p className="ws-page-subtitle">
            Keep public crypto pools you want to revisit in one place. You
            decide what stays here, and can download or erase the list at any
            time.
          </p>
        </div>
        <Link href="/markets" className="ws-pill-button">
          Explore markets <ArrowUpRight size={16} />
        </Link>
      </div>
      <SavedMarketsManager />
    </div>
  );
}

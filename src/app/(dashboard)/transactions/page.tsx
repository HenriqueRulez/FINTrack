import { TransactionsPage } from "@/components/transactions/TransactionsPage";

// ---------------------------------------------------------------------------
// /transactions — Server Component stub; mounts TransactionsPage (Client Component)
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Transactions — FINTrack",
};

export default function TransactionsRoute() {
  return <TransactionsPage />;
}

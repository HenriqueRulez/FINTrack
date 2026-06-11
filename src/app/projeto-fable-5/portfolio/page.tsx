// Fase 2: /portfolio foi substituído por /transactions (ledger).
// Redirect preserva bookmarks antigos.

import { redirect } from "next/navigation";

export default function Fable5PortfolioRedirect() {
  redirect("/projeto-fable-5/transactions");
}

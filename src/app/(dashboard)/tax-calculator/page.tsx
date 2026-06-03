import { TaxCalculatorPage } from "@/components/tax-calculator/TaxCalculatorPage";

// ---------------------------------------------------------------------------
// /tax-calculator — Server Component stub; mounts TaxCalculatorPage (Client)
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Tax Calculator — FINTrack",
};

export default function TaxCalculatorRoute() {
  return <TaxCalculatorPage />;
}

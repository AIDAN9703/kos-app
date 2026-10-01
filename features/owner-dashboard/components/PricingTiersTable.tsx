import { formatCurrency } from "@/shared/lib/utils/general-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import type { OwnerPricingTier } from "../owner.types";

/** What guests pay per charter length, and the owner's payout for it. */
export function PricingTiersTable({ tiers }: { tiers: OwnerPricingTier[] }) {
  if (tiers.length === 0) {
    return <p className="py-6 text-sm text-slate-500">No rates are published for this boat yet.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-xs text-slate-500">
          <th scope="col" className="py-3 font-medium">
            Charter
          </th>
          <th scope="col" className="py-3 text-right font-medium">
            Guest price
          </th>
          <th scope="col" className="py-3 text-right font-medium">
            Your payout
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 tabular-nums">
        {tiers.map((tier) => (
          <tr key={tier.id}>
            <th scope="row" className="py-3 font-semibold text-primary">
              {tier.label}
              {tier.label !== `${tier.hours} hours` ? (
                <span className="ml-2 text-xs font-normal text-slate-500">{tier.hours} hours</span>
              ) : null}
            </th>
            <td className="py-3 text-right text-slate-700">
              {formatCurrency(tier.guestPriceDollars)}
            </td>
            <td className="py-3 text-right font-semibold text-primary">
              {tier.ownerPayoutCents != null ? (
                formatCentsAsWholeDollars(tier.ownerPayoutCents)
              ) : (
                <span className="font-normal text-slate-400">Set per charter</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

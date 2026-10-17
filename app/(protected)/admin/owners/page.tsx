import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { listOwnerAccounts } from "@/features/owner-accounts/owner-accounts.data";
import {
  getDirectDepositOutlook,
  getOwedNowByOwner,
} from "@/features/owner-accounts/owner-payouts.data";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { NewOwnerButton } from "@/features/owner-accounts/components/admin/NewOwnerButton";
import { OwnersList } from "@/features/owner-accounts/components/admin/OwnersList";

/**
 * Owners: who each boat belongs to and who KOS pays. KOS Yachts holds the
 * boats whose owner isn't set up yet; set one up, move their boats over,
 * then invite them.
 */
export default async function AdminOwnersPage() {
  const [owners, owed, outlook] = await Promise.all([
    listOwnerAccounts(),
    getOwedNowByOwner(),
    getDirectDepositOutlook(),
  ]);
  const keepCents = outlook.dueNowCents + outlook.comingCents;
  const usd = (cents: number) => formatCentsAsCurrency(cents, { showCents: false });
  const active = owners.filter((o) => !o.isHouse && o.status === "ACTIVE").length;

  return (
    <GlassPage>
      <GlassHeader
        back="/admin/boats"
        eyebrow="Boats"
        title="Owners"
        meta={
          <span>
            {owners.length - 1} {owners.length - 1 === 1 ? "owner" : "owners"} · {active} using the
            owner portal
          </span>
        }
        actions={<NewOwnerButton />}
      />
      <p className="text-sm text-muted-foreground">
        Direct deposit is paid from KOS&apos;s Stripe balance: keep at least{" "}
        <span className="font-semibold text-foreground">{usd(keepCents)}</span> there (
        {usd(outlook.dueNowCents)} owed now, {usd(outlook.comingCents)} for trips ending in the next
        14 days).
      </p>
      <OwnersList owners={owners} owedNow={Object.fromEntries(owed)} />
    </GlassPage>
  );
}

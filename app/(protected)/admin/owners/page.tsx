import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { listOwnerAccounts } from "@/features/owner-accounts/owner-accounts.data";
import { getOwedNowByOwner } from "@/features/owner-accounts/owner-payouts.data";
import { NewOwnerButton } from "@/features/owner-accounts/components/admin/NewOwnerButton";
import { OwnersList } from "@/features/owner-accounts/components/admin/OwnersList";

/**
 * Owners: who each boat belongs to and who KOS pays. KOS Yachts holds the
 * boats whose owner isn't set up yet; set one up, move their boats over,
 * then invite them.
 */
export default async function AdminOwnersPage() {
  const [owners, owed] = await Promise.all([listOwnerAccounts(), getOwedNowByOwner()]);
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
      <OwnersList owners={owners} owedNow={Object.fromEntries(owed)} />
    </GlassPage>
  );
}

import { notFound } from "next/navigation";
import PublicProposalClient from "@/features/bookings/components/PublicProposalClient";
import { getProposal } from "@/features/bookings/proposal.data";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params;
  const data = await getProposal(token);
  if (!data) notFound();
  return <PublicProposalClient data={data} publicToken={token} />;
}

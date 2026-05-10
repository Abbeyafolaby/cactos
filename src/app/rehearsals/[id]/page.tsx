import RehearsalDetailsClient from "./rehearsal-details-client";

type RehearsalDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RehearsalDetailsPage({
  params,
}: RehearsalDetailsPageProps) {
  const { id } = await params;

  return <RehearsalDetailsClient rehearsalId={id} />;
}

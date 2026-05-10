import MemberDetailsClient from "./member-details-client";

type MemberDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MemberDetailsPage({
  params,
}: MemberDetailsPageProps) {
  const { id } = await params;

  return <MemberDetailsClient memberId={id} />;
}

import { redirect } from "next/navigation";

export default async function DirectTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/rastreamento?id=${encodeURIComponent(id)}`);
}

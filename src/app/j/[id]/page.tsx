import { notFound } from "next/navigation";
import { getJobById } from "@/lib/mock-data";
import { CardStack } from "@/components/CardStack";

export default function JobPage({ params }: { params: { id: string } }) {
  const job = getJobById(params.id);
  if (!job) notFound();
  return <CardStack job={job} />;
}

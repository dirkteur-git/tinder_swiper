import { getAllJobs } from "@/lib/mock-data";
import { InboxClient } from "@/components/InboxClient";

export default function InboxPage() {
  const jobs = getAllJobs();
  return <InboxClient jobs={jobs} />;
}

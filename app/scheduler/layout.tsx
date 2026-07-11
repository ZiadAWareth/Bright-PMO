import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Scheduler",
  description: "Simulate and analyze project schedules before approval",
};

export default function SchedulerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
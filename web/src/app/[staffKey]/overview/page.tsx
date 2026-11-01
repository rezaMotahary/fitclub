import type { Metadata } from "next";
import { StaffDoor } from "@/components/StaffDoor";

export const metadata: Metadata = {
  title: "پنل مدیریت | فیت‌کلاب",
};

type PageProps = {
  params: Promise<{ staffKey: string }>;
};

export default function AdminOverviewPage({ params }: PageProps) {
  return <StaffDoor params={params} panel="admin" view="home" />;
}

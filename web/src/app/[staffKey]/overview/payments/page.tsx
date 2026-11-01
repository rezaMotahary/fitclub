import type { Metadata } from "next";
import { StaffDoor } from "@/components/StaffDoor";

export const metadata: Metadata = {
  title: "پرداخت پذیرش | مدیریت | فیت‌کلاب",
};

type PageProps = {
  params: Promise<{ staffKey: string }>;
};

export default function AdminPaymentsPage({ params }: PageProps) {
  return <StaffDoor params={params} panel="admin" view="payments" />;
}

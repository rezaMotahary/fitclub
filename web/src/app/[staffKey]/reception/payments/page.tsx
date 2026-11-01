import type { Metadata } from "next";
import { StaffDoor } from "@/components/StaffDoor";

export const metadata: Metadata = {
  title: "پرداخت پذیرش | منشی | فیت‌کلاب",
};

type PageProps = {
  params: Promise<{ staffKey: string }>;
};

export default function SecretaryPaymentsPage({ params }: PageProps) {
  return <StaffDoor params={params} panel="secretary" view="payments" />;
}

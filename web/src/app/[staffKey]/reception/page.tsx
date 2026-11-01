import type { Metadata } from "next";
import { StaffDoor } from "@/components/StaffDoor";

export const metadata: Metadata = {
  title: "پذیرش منشی | فیت‌کلاب",
};

type PageProps = {
  params: Promise<{ staffKey: string }>;
};

export default function SecretaryReceptionPage({ params }: PageProps) {
  return <StaffDoor params={params} panel="secretary" view="home" />;
}

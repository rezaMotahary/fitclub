import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "پنل منشی | فیت‌کلاب",
};

export default function SecretaryPage() {
  return <AuthGate panel="secretary" title="پنل منشی" />;
}

import type { Metadata } from "next";
import { PaymentDesk } from "@/components/PaymentDesk";

export const metadata: Metadata = {
  title: "پرداخت پذیرش | منشی | فیت‌کلاب",
};

export default function SecretaryPaymentsPage() {
  return <PaymentDesk panel="secretary" />;
}

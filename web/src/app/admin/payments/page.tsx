import type { Metadata } from "next";
import { PaymentDesk } from "@/components/PaymentDesk";

export const metadata: Metadata = {
  title: "پرداخت پذیرش | مدیریت | فیت‌کلاب",
};

export default function AdminPaymentsPage() {
  return <PaymentDesk panel="admin" />;
}

import type { Metadata } from "next";
import { MemberLoginForm } from "@/components/MemberLoginForm";

export const metadata: Metadata = {
  title: "ورود اعضا | فیت‌کلاب",
};

export default function MemberLoginPage() {
  return <MemberLoginForm />;
}

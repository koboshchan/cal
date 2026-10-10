import type { Metadata } from "next";
import LegalPage from "../components/legal/LegalPage";
import paragraphs from "../components/legal/privacy.json";

export const metadata: Metadata = {
  title: "Privacy Policy | Cal",
  description: "Privacy Policy for Cal.",
};

export default function Page() {
  return <LegalPage paragraphs={paragraphs} download="/legal/privacy.md" />;
}

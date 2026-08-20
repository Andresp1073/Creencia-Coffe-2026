import type { Metadata } from "next";
import PanelEntry from "./panel-entry";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PanelPage() {
  return <PanelEntry />;
}
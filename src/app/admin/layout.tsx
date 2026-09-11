import type { ReactNode } from "react";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./admin.css";

// The owner's dashboard: what the testers are doing, what it costs, what they
// think. The second non-API surface after /privacy, and unlike that one it is
// private — every page under here calls requireAdmin() before it loads a row.
export const metadata = { title: "bower — dashboard", robots: { index: false, follow: false } };

const serif = Instrument_Serif({ weight: "400", style: ["italic", "normal"], subsets: ["latin"], variable: "--font-serif" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={`admin ${serif.variable} ${sans.variable} ${mono.variable}`}>{children}</div>;
}

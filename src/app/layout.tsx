import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "GW Manufacturing OS",
  description: "Gunther Werks demo admin dashboard"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const modeCookie = cookies().get("gw_mode")?.value;
  const mode = modeCookie === "technician" ? "technician" : "admin";

  return (
    <html lang="en">
      <body
        className={`min-h-screen bg-slate-950 text-slate-100 ${
          mode === "technician" ? "tech-mode" : ""
        }`}
      >
        <div className="flex min-h-screen">
          <Sidebar initialMode={mode} />
          <div className="flex min-h-screen flex-1 flex-col">
            <Topbar />
            <main className="flex-1 px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function HomePage() {
  const mode = cookies().get("gw_mode")?.value;
  if (mode === "technician") {
    redirect("/floor/station");
  }
  redirect("/builds");
}

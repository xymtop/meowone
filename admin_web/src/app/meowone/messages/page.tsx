import { redirect } from "next/navigation";

export default function MeowMessagesCompatPage() {
  redirect("/meowone/sessions?from=messages");
}


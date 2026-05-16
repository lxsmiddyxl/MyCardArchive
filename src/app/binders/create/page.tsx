import { redirect } from "next/navigation";

/** Legacy route — binder creation wizard lives at /binders/new. */
export default function CreateBinderRedirectPage() {
  redirect("/binders/new");
}

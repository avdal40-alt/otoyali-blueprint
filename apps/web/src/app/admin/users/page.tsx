import { AdminClient } from "../_components/AdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminUsersPage() {
  return <AdminClient section="users" />;
}

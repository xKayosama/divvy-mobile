import { useAppSelector } from "@/hooks/redux";
import { Redirect } from "expo-router";
export default function Index() {
  const user = useAppSelector((s) => s.auth.user);
  return <Redirect href={user ? "/groups" : "/login"} />;
}

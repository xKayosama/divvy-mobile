import { Redirect } from "expo-router";
import { useAppSelector } from "@/hooks/redux";
export default function Index() {
  const user = useAppSelector((s) => s.auth.user);
  return <Redirect href={user ? "/home" : "/login"} />;
}

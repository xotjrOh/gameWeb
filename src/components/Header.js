import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import LogOutBtn from "@/components/LogOutBtn";

export default async function Header() {
  const session = await getServerSession(authOptions);
  console.log("session : ", session);

  return (
    <div>
      <h1 className="">Welcome, {session.user.name} <LogOutBtn/></h1>
    </div>
  );
}

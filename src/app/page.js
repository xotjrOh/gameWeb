//import styles from "./page.module.css";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import AuthRedirect from "@/components/AuthRedirect";
import LogOutBtn from "@/components/LogOutBtn";

export default async function Page() {
  const session = await getServerSession(authOptions);
  console.log("session : ", session);
  if (!session) {
    return <AuthRedirect/>;
  }

  // 로그인된 경우
  return (
    <div>
      <h1 className="">Welcome, {session.user.name} <LogOutBtn/></h1>
      {/* 메인 페이지 내용 */}
    </div>
  );
}

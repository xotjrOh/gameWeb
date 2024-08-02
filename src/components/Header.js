import LogOutBtn from "@/components/LogOutBtn";

export default function Header({session}) {

  return (
    <div>
      <h1 className="">Welcome, {session.user.name} <LogOutBtn/></h1>
    </div>
  );
}

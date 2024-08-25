import Link from 'next/link';
import UserDropdown from "@/components/UserDropdown";
import Hamburger from "@/components/Hamburger";

export default function Header({ session }) {

  return (
    <div className="flex justify-between items-center p-2 bg-white text-black shadow-md">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <span className="text-xl font-bold cursor-pointer p-2 hover:bg-gray-200 rounded-full">G</span>
        </Link>
        <Hamburger />
      </div>
      <UserDropdown session={session} />
    </div>
  );
}

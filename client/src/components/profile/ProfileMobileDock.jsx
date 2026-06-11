import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useProfilePage } from "../../context/ProfilePageContext.jsx";
import { DEMO_PROFILE_AVATAR_URL } from "../../data/catalog.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

export default function ProfileMobileDock() {
  const { user } = useAuth();
  const { goToSection } = useProfilePage();

  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-lg border-t border-zinc-100 flex justify-around items-center py-4 z-50">
      <button
        type="button"
        onClick={() => goToSection("dashboard")}
        className="flex flex-col items-center gap-1 text-zinc-400"
      >
        <MaterialIcon name="dashboard" />
        <span className="text-[10px] font-bold">Dashboard</span>
      </button>
      <button
        type="button"
        onClick={() => goToSection("listings")}
        className="flex flex-col items-center gap-1 text-zinc-400"
      >
        <MaterialIcon name="inventory_2" />
        <span className="text-[10px] font-bold">Listings</span>
      </button>
      <Link to="/upload?mode=give" className="flex flex-col items-center gap-1 -mt-8">
        <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
          <MaterialIcon name="add" className="text-3xl" />
        </div>
      </Link>
      <button
        type="button"
        onClick={() => goToSection("history")}
        className="flex flex-col items-center gap-1 text-zinc-400"
      >
        <MaterialIcon name="sync_alt" />
        <span className="text-[10px] font-bold">Swaps</span>
      </button>
      <span className="flex flex-col items-center gap-1 text-green-800">
        <img
          src={user?.profileImageDataUrl || DEMO_PROFILE_AVATAR_URL}
          alt=""
          className="h-6 w-6 rounded-full object-cover border border-green-200"
        />
        <span className="text-[10px] font-bold">Profile</span>
      </span>
    </nav>
  );
}

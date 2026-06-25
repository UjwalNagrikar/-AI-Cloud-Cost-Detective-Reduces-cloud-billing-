import { BarChart3, History, LogOut, Radar } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { tokenStore } from "../api";

export default function Navbar() {
  const navigate = useNavigate();

  function logout() {
    tokenStore.clear();
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 text-sm font-semibold text-white">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-cyanline/40 bg-cyanline/10 text-cyanline">
            <Radar size={19} />
          </span>
          <span>AI Cloud Cost Detective</span>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex h-9 items-center gap-2 rounded-md px-3 text-sm ${
                isActive ? "bg-cyanline/15 text-cyanline" : "text-slate-300 hover:bg-white/5"
              }`
            }
          >
            <BarChart3 size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex h-9 items-center gap-2 rounded-md px-3 text-sm ${
                isActive ? "bg-cyanline/15 text-cyanline" : "text-slate-300 hover:bg-white/5"
              }`
            }
          >
            <History size={16} />
            History
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-300 hover:bg-white/5"
            title="Log out"
          >
            <LogOut size={17} />
          </button>
        </nav>
      </div>
    </header>
  );
}

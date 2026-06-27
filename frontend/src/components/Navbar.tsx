import { BarChart3, Clock, LogOut, Radar } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { tokenStore } from "../api";

export default function Navbar() {
  const navigate = useNavigate();

  function logout() {
    tokenStore.clear();
    navigate("/login");
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(2, 11, 24, 0.85)",
        borderColor: "rgba(0, 212, 255, 0.1)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-signal/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div
              className="relative h-9 w-9 rounded-xl flex items-center justify-center border"
              style={{
                background: "rgba(0, 212, 255, 0.08)",
                borderColor: "rgba(0, 212, 255, 0.2)",
              }}
            >
              <Radar size={18} className="text-signal" />
            </div>
          </div>
          <div className="leading-none">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
              AI Cloud Cost
            </div>
            <div
              className="text-[15px] font-bold font-display tracking-tight"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Detective
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "text-signal"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: "rgba(0, 212, 255, 0.08)",
                    boxShadow: "inset 0 0 0 1px rgba(0, 212, 255, 0.18)",
                  }
                : {}
            }
          >
            <BarChart3 size={15} />
            Dashboard
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "text-signal"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: "rgba(0, 212, 255, 0.08)",
                    boxShadow: "inset 0 0 0 1px rgba(0, 212, 255, 0.18)",
                  }
                : {}
            }
          >
            <Clock size={15} />
            History
          </NavLink>

          {/* Divider */}
          <div className="w-px h-5 bg-frame/80 mx-1" />

          <button
            type="button"
            onClick={logout}
            title="Log out"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all duration-150"
          >
            <LogOut size={15} />
          </button>
        </nav>
      </div>
    </header>
  );
}
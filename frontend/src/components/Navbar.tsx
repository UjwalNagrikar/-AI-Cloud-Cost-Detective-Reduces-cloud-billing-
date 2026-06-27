import { Link } from "react-router-dom";
import { Home, History, BarChart3 } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="border-b border-line bg-panel/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-cyanline" size={24} />
          <span className="text-lg font-bold text-white">Cost Detective</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            <Home size={18} />
          </Link>
          <Link to="/history" className="text-sm text-slate-300 hover:text-white">
            <History size={18} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
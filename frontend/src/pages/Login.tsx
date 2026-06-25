import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { login, tokenStore } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await login(email, password);
      tokenStore.set(response.token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-md border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-cyanline/10 text-cyanline">
            <LockKeyhole size={20} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white">Log in</h1>
            <p className="text-sm text-slate-400">AI Cloud Cost Detective</p>
          </div>
        </div>

        <label className="block text-sm text-slate-300">
          Email
          <input
            className="mt-2 h-11 w-full rounded-md border border-line bg-ink px-3 text-white outline-none focus:border-cyanline"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="mt-4 block text-sm text-slate-300">
          Password
          <input
            className="mt-2 h-11 w-full rounded-md border border-line bg-ink px-3 text-white outline-none focus:border-cyanline"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">{error}</p>}

        <button
          className="mt-6 h-11 w-full rounded-md bg-cyanline px-4 font-semibold text-ink hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          New here? <Link className="text-cyanline hover:underline" to="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
}

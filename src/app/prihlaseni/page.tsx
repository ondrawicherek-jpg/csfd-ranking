"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

interface UserEntry {
  id: number;
  username: string;
}

export default function PrihlaseniPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json() as { users?: UserEntry[] };
      setUsers(data.users || []);
      if ((data.users || []).length === 0) setShowAdd(true);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (username: string) => {
    const err = await login(username);
    if (!err) router.push("/");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const err = await register(newName);
    setAdding(false);
    if (err) {
      setError(err);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Filmotéka</h1>
          <p className="text-text-secondary text-sm mt-1">Vyber nebo přidej uživatele</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Existing users */}
            {users.length > 0 && (
              <div className="space-y-2 mb-6">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(u.username)}
                    className="w-full flex items-center gap-3 bg-bg-card hover:bg-bg-hover border border-border rounded-xl px-4 py-3.5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent font-semibold text-sm">
                        {u.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-text-primary">{u.username}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Add user */}
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full py-3 rounded-xl border border-dashed border-border text-text-muted hover:border-accent hover:text-accent text-sm transition-colors"
              >
                + Přidat uživatele
              </button>
            )}

            {showAdd && (
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-text-primary text-sm outline-none focus:border-accent transition-colors"
                    placeholder="Jméno uživatele"
                    autoFocus
                    minLength={2}
                    maxLength={30}
                  />
                </div>

                {error && (
                  <p className="text-unseen text-sm bg-unseen/10 rounded-xl px-4 py-3">{error}</p>
                )}

                <div className="flex gap-2">
                  {users.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowAdd(false); setError(null); }}
                      className="flex-1 py-3 rounded-xl border border-border text-text-muted text-sm hover:bg-bg-hover transition-colors"
                    >
                      Zpět
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={adding || newName.trim().length < 2}
                    className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {adding ? "Vytvářím..." : "Vytvořit"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

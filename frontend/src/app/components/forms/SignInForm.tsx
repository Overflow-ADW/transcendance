"use client";

import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: appeler une API (Next.js route handler) si besoin
    // console.log({ email, user, pass });
    alert(`register: ${email} / ${user}`);
  };

  return (
    <form onSubmit={submit} className="w-full">
      <input
        type="email"
        placeholder="email"
        className="mb-10 text-center w-full p-4 bg-black text-white border-2 border-pink-500 uppercase"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="username"
        className="mb-10 text-center w-full p-4 bg-black text-white border-2 border-pink-500"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="password"
        className="mb-10 text-center w-full p-4 bg-black text-white border-2 border-pink-500"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        required
      />
      <button
        type="submit"
        className="mb-10 w-full py-4 bg-purple-600 text-white font-bold border-2 border-white"
      >
        register
      </button>
    </form>
  );
}

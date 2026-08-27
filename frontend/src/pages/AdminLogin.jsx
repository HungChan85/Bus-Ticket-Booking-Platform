import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../utils/auth";
import { apiUrl } from "../utils/api";
import "../App.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = getStoredUser();
    if (existing?.role === "ADMIN") {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "admin" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Login failed");
        return;
      }
      const authPayload = { user: data.user, token: data.token };
      localStorage.setItem("auth", JSON.stringify(authPayload));
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/admin");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Cannot connect to server. Please ensure Backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-page">
        <div className="auth-container">
          <h2 className="auth-title">ADMIN LOGIN</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                name="email"
                type="text"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Processing..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

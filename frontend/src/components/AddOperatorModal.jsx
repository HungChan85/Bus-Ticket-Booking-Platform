// src/components/AddOperatorModal.jsx
import React, { useState } from "react";
import { getAuthHeaders } from "../utils/auth";

export default function AddOperatorModal({ open, onClose, onCreated, apiBase, authHeaders }) {
  const [form, setForm] = useState({
    legal_name: "",
    brand_name: "",
    brand_email: "",
    tax_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const mergedHeaders = authHeaders || getAuthHeaders();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setSaving(true);

      const res = await fetch(`${apiBase}/operators`, {
        method: "POST",
        headers: { ...mergedHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Tạo operator thất bại");
      }

      // backend trả {"status":"created","operator":{...}}
      if (onCreated) {
        onCreated(data.operator);
      }

      // reset + đóng modal
      setForm({
        legal_name: "",
        brand_name: "",
        brand_email: "",
        tax_id: "",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">Add Operator</h2>
          <button className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit}>
          {error && <p style={{ color: "red" }}>{error}</p>}

          <div className="modal__field">
            <label>Legal name</label>
            <input
              name="legal_name"
              value={form.legal_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal__field">
            <label>Brand name</label>
            <input
              name="brand_name"
              value={form.brand_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal__field">
            <label>Brand email</label>
            <input
              type="email"
              name="brand_email"
              value={form.brand_email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal__field">
            <label>Tax ID</label>
            <input
              name="tax_id"
              value={form.tax_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn--secondary btn--sm"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Thêm operator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

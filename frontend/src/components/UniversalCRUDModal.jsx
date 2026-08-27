import { useEffect, useState } from "react";
import { toDateTimeLocal, toBackendDateTime } from "../utils/date";
import { getAuthHeaders } from "../utils/auth";

export default function UniversalCRUDModal({
  open,
  onClose,
  mode, // "add" | "edit"
  title,
  fields,
  data,
  apiBase,
  api,
  onSaved,
  authHeaders,
}) {
  const [form, setForm] = useState({});

  // ==========================================================
  // Init form (ADD or EDIT)
  // ==========================================================
  useEffect(() => {
    if (!open) return;

    const init = {};

    if (mode === "edit" && data) {
      fields.forEach((f) => {
        let v = data[f.key];

        // Convert datetime-local fields
        if (f.type === "datetime-local") {
          v = toDateTimeLocal(v);
        }

        // Convert date-only fields → YYYY-MM-DD
        if (f.type === "date") {
          let parsed = "";
          if (v) {
            const d = new Date(v);
            if (!isNaN(d.getTime())) {
              const pad = (n) => String(n).padStart(2, "0");
              const yyyy = d.getFullYear();
              const mm = pad(d.getMonth() + 1);
              const dd = pad(d.getDate());
              parsed = `${yyyy}-${mm}-${dd}`;
            }
          }
          v = parsed;
        }

        init[f.key] = v ?? "";
      });
    } else {
      fields.forEach((f) => (init[f.key] = ""));
    }

    setForm(init);
  }, [open, mode, data, fields]);

  if (!open) return null;

  // ==========================================================
  // SAVE handler
  // ==========================================================
  async function handleSave() {
    const idField = fields.find((f) => f.isId);
    const id = idField && data ? data[idField.key] : null;

    const url =
      mode === "edit" ? `${apiBase}/${api}/${id}` : `${apiBase}/${api}`;
    const method = mode === "edit" ? "PATCH" : "POST";

    const payload = {};

    fields.forEach((f) => {
      if (f.isId || f.readonly) return;

      const val = form[f.key];
      if (val === "" || val == null) return;

      if (f.type === "datetime-local") {
        payload[f.key] = toBackendDateTime(val); // yyyy-mm-dd hh:mm:ss
      } else if (f.type === "date") {
        payload[f.key] = val; // yyyy-mm-dd
      } else {
        payload[f.key] = val; // raw
      }
    });

    try {
      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders("application/json"), ...(authHeaders || {}) },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Save failed:", await res.text());
        alert("Save failed!");
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error");
    }
  }

  // ==========================================================
  // FIELD RENDERER
  // ==========================================================
  function renderField(f) {
    const value = form[f.key] ?? "";

    // ------ SELECT ------
    if (f.type === "select") {
      return (
        <select
          className="modal__input"
          value={value}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        >
          <option value="">-- select --</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    // ------ TEXTAREA ------
    if (f.type === "textarea") {
      return (
        <textarea
          className="modal__input modal__input--textarea"
          value={value}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        />
      );
    }

    // ------ DATE PICKER (YYYY-MM-DD) ------
    if (f.type === "date") {
      return (
        <input
          type="date"
          className="modal__input"
          value={value || ""}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        />
      );
    }

    // ------ DATETIME-LOCAL PICKER ------
    if (f.type === "datetime-local") {
      return (
        <input
          type="datetime-local"
          className="modal__input"
          value={value || ""}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        />
      );
    }

    // ------ DEFAULT TEXT INPUT ------
    return (
      <input
        type={f.type || "text"}
        disabled={f.readonly}
        className="modal__input"
        value={value}
        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
      />
    );
  }

  // ==========================================================
  // RENDER MODAL
  // ==========================================================
  return (
    <div className="modal-backdrop">
      <div className="modal modal--scroll">

        {/* HEADER */}
        <div className="modal__header">
          <h2 className="modal__title">
            {mode === "add" ? "Add" : "Edit"} {title}
          </h2>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* BODY (scrollable) */}
        <div className="modal__body modal__body--scroll">
          {fields.map((f) => (
            <div className="modal__field" key={f.key}>
              <label>{f.label}</label>
              {renderField(f)}
            </div>
          ))}
        </div>

        {/* FOOTER (fixed) */}
        <div className="modal__footer">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--secondary btn--sm" onClick={handleSave}>
            Save
          </button>
        </div>

      </div>
    </div>
  );
}

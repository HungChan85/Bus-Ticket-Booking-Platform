import React, { useEffect, useState } from "react";
import { getAuthHeaders } from "../utils/auth";

const STATUS_OPTIONS = ["Active", "Inactive", "Suspended"];

export default function AccountDetailModal({
  open,
  type, // 'passenger' | 'staff'
  id, // passenger_id hoặc staff_id
  apiBase, // ví dụ: "http://localhost:9000/admin"
  authHeaders,
  onClose,
}) {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const mergedHeaders = authHeaders || getAuthHeaders();

  // fetch account-info khi mở modal
  useEffect(() => {
    if (!open || !id || !type) return;

    async function fetchInfo() {
      try {
        setLoading(true);
        setError(null);
        setInfo(null);

        const url =
          type === "passenger"
            ? `${apiBase}/passengers/${id}/account-info`
            : `${apiBase}/staffs/${id}/account-info`;

        const res = await fetch(url, { headers: mergedHeaders });
        if (!res.ok) {
          throw new Error("Không lấy được account info");
        }
        const data = await res.json();
        setInfo(data);
        // backend trả 'stat' nên map sang status
        setStatus(data.stat || data.status || "");
      } catch (err) {
        setError(err.message || "Đã có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    }

    fetchInfo();
  }, [open, id, type, apiBase]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const url =
        type === "passenger"
          ? `${apiBase}/passengers/${id}/account-status`
          : `${apiBase}/staffs/${id}/account-status`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { ...mergedHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Cập nhật status thất bại");
      }

      const result = await res.json();
      // cập nhật info trong modal cho hợp
      setInfo((prev) => ({ ...(prev || {}), stat: result.new_status }));
      setStatus(result.new_status || status);
      alert("Cập nhật status thành công");
      onClose();
    } catch (err) {
      setError(err.message || "Đã có lỗi xảy ra khi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">
            Account detail · {type === "passenger" ? "Passenger" : "Staff"} #{id}
          </h2>
          <button className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          {loading && <p>Đang tải account info...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          {!loading && !error && info && (
            <>
              <div className="modal__field">
                <label>Email</label>
                <input value={info.email || ""} disabled />
              </div>

              <div className="modal__field">
                <label>Phone</label>
                <input value={info.phone || ""} disabled />
              </div>

              <div className="modal__field">
                <label>Created at</label>
                <input value={info.create_at || ""} disabled />
              </div>

              <div className="modal__field">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">-- chọn status --</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="modal__footer">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            disabled={saving}
          >
            Đóng
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleSave}
            disabled={saving || !status}
          >
            {saving ? "Đang lưu..." : "Lưu status"}
          </button>
        </div>
      </div>
    </div>
  );
}

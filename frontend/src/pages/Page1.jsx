import React, { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import AccountDetailModal from "../components/AccountDetailModal";
import AddOperatorModal from "../components/AddOperatorModal";
import { getAuthHeaders } from "../utils/auth";
import { apiUrl } from "../utils/api";

const API_BASE = `${apiUrl("/api/admin")}`;

export default function Page1() {
  const [staffs, setStaffs] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [operators, setOperators] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState(null);
  const [detailId, setDetailId] = useState(null);

  // state cho modal Add Operator
  const [addOpOpen, setAddOpOpen] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        const [passRes, staffRes, opRes] = await Promise.all([
          fetch(`${API_BASE}/passengers`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/staffs`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/operators`, { headers: getAuthHeaders() }),
        ]);

        if (!passRes.ok || !staffRes.ok || !opRes.ok) {
          throw new Error("Lỗi khi gọi API");
        }

        setPassengers(await passRes.json());
        setStaffs(await staffRes.json());
        setOperators(await opRes.json());
      } catch (err) {
        console.error(err);
        setError(err.message || "Đã có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const openDetail = (type, id) => {
    setDetailType(type);
    setDetailId(id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailType(null);
    setDetailId(null);
  };

  const handleDeleteOperator = async (row) => {
    if (!window.confirm("Bạn có chắc muốn xoá operator này?")) return;

    try {
      const res = await fetch(`${API_BASE}/operators/${row.operator_id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Xoá operator thất bại");

      setOperators((prev) =>
        prev.filter((op) => op.operator_id !== row.operator_id)
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOperatorCreated = (newOp) => {
    // newOp là object từ backend: {legal_name, brand_name,...}
    // nếu backend chưa trả operator_id, có thể refetch lại list
    setOperators((prev) => [...prev, newOp]);
  };

  if (loading) {
    return (
      <div className="admin-page">
        <h1 className="admin-page__title">
        Human Resources & Customer Management
        </h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <h1 className="admin-page__title">
          Human Resources & Customer Management
        </h1>
        <p style={{ color: "red" }}>Lỗi: {error}</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">
        Human Resources & Customer Management
      </h1>

      {/* STAFFS */}
      <DataTable
        title="Staffs"
        columns={[
          { key: "staff_id", label: "Staff ID" },
          { key: "person_name", label: "Name" },
          { key: "gov_id_num", label: "Gov ID" },
          { key: "date_of_birth", label: "Date of Birth" },
          { key: "account_id", label: "Account ID" },
        ]}
        data={staffs}
        renderActions={(row) => (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => openDetail("staff", row.staff_id)}
          >
            Detail
          </button>
        )}
      />

      {/* PASSENGERS */}
      <DataTable
        title="Passengers"
        columns={[
          { key: "passenger_id", label: "Passenger ID" },
          { key: "person_name", label: "Name" },
          { key: "gov_id_num", label: "Gov ID" },
          { key: "date_of_birth", label: "Date of Birth" },
          { key: "account_id", label: "Account ID" },
        ]}
        data={passengers}
        renderActions={(row) => (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => openDetail("passenger", row.passenger_id)}
          >
            Detail
          </button>
        )}
      />

      {/* OPERATORS – có Add ở góc trên bên phải */}
      <DataTable
        title="Operators"
        columns={[
          { key: "operator_id", label: "Operator ID" },
          { key: "legal_name", label: "Legal Name" },
          { key: "brand_name", label: "Brand Name" },
          { key: "brand_email", label: "Email" },
          { key: "tax_id", label: "Tax ID" },
        ]}
        data={operators}
        headerActions={
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => setAddOpOpen(true)}
          >
            + Add
          </button>
        }
        renderActions={(row) => (
          <button
            className="btn btn--danger btn--sm"
            onClick={() => handleDeleteOperator(row)}
          >
            Delete
          </button>
        )}
      />

      {/* Modal detail account */}
      <AccountDetailModal
        open={detailOpen}
        type={detailType}
        id={detailId}
        apiBase={API_BASE}
        authHeaders={getAuthHeaders()}
        onClose={closeDetail}
      />

      {/* Modal add operator */}
      <AddOperatorModal
        open={addOpOpen}
        onClose={() => setAddOpOpen(false)}
        onCreated={handleOperatorCreated}
        apiBase={API_BASE}
        authHeaders={getAuthHeaders()}
      />
    </div>
  );
}

// src/pages/Page3.jsx
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import UniversalCRUDModal from "../components/UniversalCRUDModal";
import BookingTicketsModal from "../components/BookingTicketsModal";
import { getAuthHeaders } from "../utils/auth";
import { apiUrl } from "../utils/api";

const API = apiUrl("/api/admin");

export default function Page3() {
  const [bookings, setBookings] = useState([]);
  const [fares, setFares] = useState([]);
  const [operators, setOperators] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [modalApi, setModalApi] = useState("");
  const [modalFields, setModalFields] = useState([]);
  const [modalData, setModalData] = useState(null);
  const [modalTitle, setModalTitle] = useState("");

  // Tickets modal
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    refresh("bookings");
    refresh("fares");
    refresh("operators");
  }, []);

  async function refresh(type) {
    try {
      const res = await fetch(`${API}/${type}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        console.error("Failed to fetch", type, await res.text());
        return;
      }
      const data = await res.json();

      if (type === "bookings") setBookings(data);
      if (type === "fares") setFares(data);
      if (type === "operators") setOperators(data);
    } catch (err) {
      console.error("Error fetching", type, err);
    }
  }

  // Map operator_id -> legal_name
  const operatorMap = useMemo(() => {
    const m = {};
    operators.forEach((o) => {
      m[o.operator_id] = o.legal_name;
    });
    return m;
  }, [operators]);

  const bookingsView = bookings.map((b) => ({
    ...b,
    operator_display: operatorMap[b.operator_id]
      ? `${b.operator_id} – ${operatorMap[b.operator_id]}`
      : b.operator_id,
  }));

  // CONFIG FIELDS
  const bookingFieldsEdit = [
    { key: "booking_id", label: "Booking ID", readonly: true, isId: true },
    { key: "booking_status", label: "Status" },
    { key: "admin_note", label: "Admin Note", type: "textarea" },
  ];

// Trước đây (chỉ là text):
// { key: "valid_from", label: "Valid From (YYYY-MM-DD)" },
// { key: "valid_to", label: "Valid To (YYYY-MM-DD)" },

// Đổi thành:
const fareFieldsAdd = [
  { key: "currency", label: "Currency" },
  { key: "discount", label: "Discount (%)" },

  // 👇 Hai dòng này dùng date picker
  { key: "valid_from", label: "Valid From", type: "date" },
  { key: "valid_to", label: "Valid To", type: "date" },

  { key: "taxes", label: "Taxes (%)" },
  { key: "route_id", label: "Route ID" },
  { key: "surcharges", label: "Surcharges" },
  { key: "base_fare", label: "Base Fare" },
  { key: "seat_price", label: "Seat Price" },
  {
    key: "seat_class",
    label: "Seat Class",
    type: "select",
    options: ["VIP", "Standard", "Economy"],
  },
];

const fareFieldsEdit = [
  { key: "fare_id", label: "Fare ID", readonly: true, isId: true },
  ...fareFieldsAdd,
];



  // MODAL HANDLERS
  function openEdit(api, fields, title, row) {
    setModalApi(api);
    setModalFields(fields);
    setModalTitle(title);
    setModalMode("edit");
    setModalData(row);
    setModalOpen(true);
  }

  function openAdd(api, fields, title) {
    setModalApi(api);
    setModalFields(fields);
    setModalTitle(title);
    setModalMode("add");
    setModalData(null);
    setModalOpen(true);
  }

  async function deleteRow(api, id) {
    if (!window.confirm("Are you sure?")) return;

    const res = await fetch(`${API}/${api}/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    refresh(api);
  }

  function openTicketsModal(booking) {
    setSelectedBooking(booking);
    setTicketModalOpen(true);
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Trang 3 · Bookings / Fare Rules</h1>

      {/* BOOKINGS */}
      <DataTable
        title="Bookings"
        columns={[
          { key: "booking_id", label: "ID" },
          { key: "currency", label: "Currency" },
          { key: "total_amount", label: "Total Amount" },
          { key: "account_id", label: "Account" },
          { key: "operator_display", label: "Operator" },
          { key: "booking_status", label: "Status" },
          { key: "admin_note", label: "Note" },
        ]}
        data={bookingsView}
        renderActions={(row) => (
          <>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => openTicketsModal(row)}
            >
              Tickets
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() =>
                openEdit("bookings", bookingFieldsEdit, "Booking", row)
              }
            >
              Edit
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => deleteRow("bookings", row.booking_id)}
            >
              Delete
            </button>
          </>
        )}
      />

      {/* FARES */}
      <DataTable
        title="Fare Rules"
        columns={[
          { key: "fare_id", label: "Fare ID" },
          { key: "currency", label: "Currency" },
          { key: "seat_class", label: "Class" },
          { key: "route_id", label: "Route" },
          { key: "seat_price", label: "Seat Price" },
          { key: "base_fare", label: "Base Fare" },
          { key: "discount", label: "Discount" },
          { key: "taxes", label: "Taxes" },
          { key: "valid_from", label: "Valid From" },
          { key: "valid_to", label: "Valid To" },
          { key: "surcharges", label: "Surcharges" },
        ]}
        data={fares}
        headerActions={
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => openAdd("fares", fareFieldsAdd, "Fare Rule")}
          >
            + Add
          </button>
        }
        renderActions={(row) => (
          <>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() =>
                openEdit("fares", fareFieldsEdit, "Fare Rule", row)
              }
            >
              Edit
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => deleteRow("fares", row.fare_id)}
            >
              Delete
            </button>
          </>
        )}
      />

      {/* CRUD Modal */}
      <UniversalCRUDModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        apiBase={API}
        api={modalApi}
        fields={modalFields}
        data={modalData}
        title={modalTitle}
        authHeaders={getAuthHeaders()}
        onSaved={() => refresh(modalApi)}
      />

      {/* Tickets Modal */}
      <BookingTicketsModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        apiBase={API}
        booking={selectedBooking}
        authHeaders={getAuthHeaders()}
      />
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { getAuthHeaders } from "../utils/auth";

const TICKET_STATUS_OPTIONS = ["Issued", "Used", "Refunded", "Cancelled"];

export default function BookingTicketsModal({ open, onClose, booking, apiBase, authHeaders }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [adding, setAdding] = useState(false);

  const [formAdd, setFormAdd] = useState({
    trip_id: "",
    fare_id: "",
    seat_codes: "",
  });

  // Load ticket list
  useEffect(() => {
    if (!open || !booking) return;
    loadTickets();
  }, [open, booking?.booking_id]);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/tickets?booking_id=${booking.booking_id}`,
        { headers: authHeaders || getAuthHeaders() }
      );

      if (!res.ok) {
        console.error("Failed to fetch tickets:", await res.text());
        setTickets([]);
        return;
      }

      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!open || !booking) return null;

  function updateLocal(ticketId, field, value) {
    setTickets((prev) =>
      prev.map((t) =>
        t.ticket_id === ticketId ? { ...t, [field]: value } : t
      )
    );
  }

  async function saveTicketStatus(ticket) {
    try {
      setSavingId(ticket.ticket_id);

      const res = await fetch(`${apiBase}/tickets/${ticket.ticket_id}`, {
        method: "PATCH",
        headers: { ...(authHeaders || getAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_status: ticket.ticket_status }),
      });

      if (!res.ok) {
        alert("Failed to update ticket");
        console.error(await res.text());
        return;
      }

      await loadTickets();
    } catch (err) {
      console.error("Update ticket error:", err);
    } finally {
      setSavingId(null);
    }
  }

  async function addTicket(e) {
    e.preventDefault();

    if (!formAdd.trip_id || !formAdd.fare_id || !formAdd.seat_codes) {
      alert("Please fill trip_id, fare_id, seat_codes");
      return;
    }

    const seat_codes = formAdd.seat_codes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setAdding(true);
    try {
      const res = await fetch(
        `${apiBase}/bookings/${booking.booking_id}/tickets`,
        {
          method: "POST",
          headers: { ...(authHeaders || getAuthHeaders()), "Content-Type": "application/json" },
          body: JSON.stringify({
            trip_id: Number(formAdd.trip_id),
            fare_id: Number(formAdd.fare_id),
            seat_codes,
          }),
        }
      );

      if (!res.ok) {
        alert("Add ticket failed");
        console.error(await res.text());
        return;
      }

      setFormAdd({ trip_id: "", fare_id: "", seat_codes: "" });
      await loadTickets();
    } catch (err) {
      console.error("Add ticket error:", err);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide">

        <div className="modal__header">
          <h2 className="modal__title">Tickets for Booking #{booking.booking_id}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body">

          {loading ? (
            <p>Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p>No tickets found for this booking.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Trip ID</th>
                    <th>Fare ID</th>
                    <th>Seat Code</th>
                    <th>Status</th>
                    <th>Seat Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.ticket_id}>
                      <td>{t.ticket_id}</td>
                      <td>{t.trip_id}</td>
                      <td>{t.fare_id}</td>
                      <td>{t.seat_code}</td>
                      <td>
                        <select
                          className="modal__input"
                          value={t.ticket_status}
                          onChange={(e) =>
                            updateLocal(t.ticket_id, "ticket_status", e.target.value)
                          }
                        >
                          {TICKET_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                      <td>{t.seat_price}</td>
                      <td>
                        <button
                          className="btn btn--secondary btn--sm"
                          disabled={savingId === t.ticket_id}
                          onClick={() => saveTicketStatus(t)}
                        >
                          {savingId === t.ticket_id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <hr className="modal__divider" />

          <h3>Add Ticket</h3>
          <form className="modal__inline-form" onSubmit={addTicket}>
            <div className="modal__field">
              <label>Trip ID</label>
              <input
                className="modal__input"
                value={formAdd.trip_id}
                onChange={(e) =>
                  setFormAdd((f) => ({ ...f, trip_id: e.target.value }))
                }
              />
            </div>

            <div className="modal__field">
              <label>Fare ID</label>
              <input
                className="modal__input"
                value={formAdd.fare_id}
                onChange={(e) =>
                  setFormAdd((f) => ({ ...f, fare_id: e.target.value }))
                }
              />
            </div>

            <div className="modal__field" style={{ flex: 2 }}>
              <label>Seat Codes (comma separated)</label>
              <input
                className="modal__input"
                placeholder="1A, 1B"
                value={formAdd.seat_codes}
                onChange={(e) =>
                  setFormAdd((f) => ({ ...f, seat_codes: e.target.value }))
                }
              />
            </div>

            <div className="modal__field">
              <label>&nbsp;</label>
              <button
                className="btn btn--secondary btn--sm"
                type="submit"
                disabled={adding}
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
          </form>

        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

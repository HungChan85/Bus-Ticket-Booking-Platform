import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import UniversalCRUDModal from "../components/UniversalCRUDModal";
import { getAuthHeaders } from "../utils/auth";
import { apiUrl } from "../utils/api";

const API = apiUrl("/api/admin");

export default function Page2() {
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [buses, setBuses] = useState([]);
  const [stations, setStations] = useState([]);
  const [operators, setOperators] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [modalApi, setModalApi] = useState("");
  const [modalFields, setModalFields] = useState([]);
  const [modalData, setModalData] = useState(null);
  const [modalTitle, setModalTitle] = useState("");

  // -----------------------------
  // FETCH DATA
  // -----------------------------
  useEffect(() => {
    refresh("routes");
    refresh("trips");
    refresh("buses");
    refresh("stations");
    refresh("operators");
  }, []);

  async function refresh(type) {
    try {
      const res = await fetch(`${API}/${type}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        console.error(`Failed to fetch ${type}`, await res.text());
        return;
      }
      const data = await res.json();

      if (type === "routes") setRoutes(data);
      if (type === "trips") setTrips(data);
      if (type === "buses") setBuses(data);
      if (type === "stations") setStations(data);
      if (type === "operators") setOperators(data);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
    }
  }

  // -----------------------------
  // OPERATOR MAP (operator_id -> legal_name)
  // -----------------------------
  const operatorMap = useMemo(() => {
    const m = {};
    operators.forEach((op) => {
      if (op.operator_id && op.legal_name) {
        m[op.operator_id] = op.legal_name;
      }
    });
    return m;
  }, [operators]);
  // -----------------------------
  // STATION MAP (station_id or arrival_station -> station_name)
  // -----------------------------

  const stationMap = useMemo(() => {
  const m = {};
  stations.forEach((s) => {
    if (s.station_id && s.station_name) {
      m[s.station_id] = s.station_name; 
    }
  });
  return m;
}, [stations]);


  // Decorate data for display (keep id fields để delete/edit dùng được)
const routesView = routes.map((r) => ({
  ...r,
  station_display: stationMap[r.station_id]
    ? `${r.station_id} – ${stationMap[r.station_id]}`
    : r.station_id || "",

  arrival_display: stationMap[r.arrival_station]
    ? `${r.arrival_station} – ${stationMap[r.arrival_station]}`
    : r.arrival_station || "",

  operator_display: operatorMap[r.operator_id]
    ? `${r.operator_id} – ${operatorMap[r.operator_id]}`
    : r.operator_id || "",
}));


  const busesView = buses.map((b) => ({
    ...b,
    operator_display: operatorMap[b.operator_id]
      ? `${b.operator_id} – ${operatorMap[b.operator_id]}`
      : b.operator_id || "",
  }));

  const stationsView = stations.map((s) => {
    const longtitude = s.longtitude ?? s.longtitude; // backend trả "longtitude", PATCH cần "longtitude"
    return {
      ...s,
      longtitude,
      operator_display: operatorMap[s.operator_id]
        ? `${s.operator_id} – ${operatorMap[s.operator_id]}`
        : s.operator_id || "",
    };
  });

  // Trips tạm thời giữ nguyên bus_id / route_id dạng số
  const tripsView = trips; 

  // -----------------------------
  // FIELD CONFIGS
  // -----------------------------

  // ROUTES (routetrip)
  const routeFieldsAdd = [
    { key: "default_duration_time", label: "Duration (HH:MM or HH:MM:SS)" },
    { key: "distance", label: "Distance" },
    { key: "station_id", label: "Departure Station ID" },
    { key: "operator_id", label: "Operator ID" },
    { key: "arrival_station", label: "Arrival Station" },
  ];

  // Cho edit: sử dụng route_id làm id, không cần chỉnh sửa route_id
  const routeFieldsEdit = [
    { key: "route_id", label: "Route ID", readonly: true, isId: true },
    { key: "default_duration_time", label: "Duration (HH:MM or HH:MM:SS)" },
    { key: "distance", label: "Distance" },
    { key: "station_id", label: "Departure Station ID" },
    // operator_id technically patch được, nhưng backend đang convert int hơi lỗi,
    // để tránh 400 thì tạm thời không cho sửa operator_id ở UI.
    { key: "arrival_station", label: "Arrival Station" },
  ];

  // TRIPS
  // Add: service_date + chọn bus_id, route_id (dropdown)
function buildTripFieldsAdd() {
  return [
    {
      key: "service_date",
      label: "Service Date",
      type: "datetime-local",
    },
    {
      key: "bus_id",
      label: "Bus",
      type: "select",
      options: buses.map((b) => String(b.bus_id)),
    },
    {
      key: "route_id",
      label: "Route",
      type: "select",
      options: routes.map((r) => String(r.route_id)),
    },
  ];
}


  // Edit: chỉ cho phép sửa trip_status + service_date (đúng với PATCH /trips/<id>)
  const tripFieldsEdit = [
    { key: "trip_id", label: "Trip ID", readonly: true, isId: true },
    {
      key: "trip_status",
      label: "Status",
      type: "select",
      options: ["Scheduled", "Departed", "Arrived", "Cancelled"],
    },
    {
      key: "service_date",
      label: "Service Date",
      type: "datetime-local"
    },

  ];

  // BUSES
  const busFieldsAdd = [
    { key: "plate_number", label: "Plate Number" },
    { key: "capacity", label: "Capacity" },
    {
      key: "vehicle_type",
      label: "Vehicle Type",
      type: "select",
      options: ["Sleeper", "Seater", "Limousine"],
    },
    {
      key: "bus_active_flag",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive", "Maintenance"],
    },
    {
      key: "operator_id",
      label: "Operator ID",
      // có thể chuyển thành select operator_id nếu muốn
    },
  ];

  // Edit bus: PATCH /buses/<id> chỉ cho phép bus_active_flag & capacity
  const busFieldsEdit = [
    { key: "bus_id", label: "Bus ID", readonly: true, isId: true },
    {
      key: "capacity",
      label: "Capacity",
    },
    {
      key: "bus_active_flag",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive", "Maintenance"],
    },
  ];

  // STATIONS
  const stationFieldsAdd = [
    { key: "station_name", label: "Station Name" },
    { key: "city", label: "City" },
    { key: "province", label: "Province" },
    { key: "address_station", label: "Address", type: "textarea" },
    { key: "latitude", label: "Latitude" },
    { key: "longtitude", label: "longtitude" }, // JSON key backend đang dùng
    {
      key: "active_flag",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive", "Maintenance"],
    },
    { key: "operator_id", label: "Operator ID" },
  ];

  const stationFieldsEdit = [
    { key: "station_id", label: "ID", readonly: true, isId: true },
    { key: "station_name", label: "Station Name" },
    { key: "city", label: "City" },
    { key: "province", label: "Province" },
    { key: "address_station", label: "Address", type: "textarea" },
    { key: "latitude", label: "Latitude" },
    { key: "longtitude", label: "longtitude" }, // modal sẽ đọc từ row.longtitude (mình đã normalize)
    {
      key: "active_flag",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive", "Maintenance"],
    },
    { key: "operator_id", label: "Operator ID" },
  ];

  // -----------------------------
  // MODAL HELPERS
  // -----------------------------
  function openAdd(api, fields, title) {
    setModalApi(api);
    setModalFields(fields);
    setModalTitle(title);
    setModalMode("add");
    setModalData(null);
    setModalOpen(true);
  }

  function openEdit(api, fields, title, row) {
    setModalApi(api);
    setModalFields(fields);
    setModalTitle(title);
    setModalMode("edit");
    setModalData(row);
    setModalOpen(true);
  }

  async function deleteRow(api, id) {
    if (!window.confirm("Are you sure?")) return;
    try {
      await fetch(`${API}/${api}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      refresh(api);
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="admin-page">
      <h1 className="admin-page__title">
        Transport Management Dashboard
      </h1>

      {/* ROUTES =================================================== */}
      <DataTable
        title="Routes"
        columns={[
          { key: "route_id", label: "ID" },
          { key: "station_display", label: "Departure Station" },
          { key: "arrival_display", label: "Arrival Station" },
          { key: "operator_display", label: "Operator" },
          { key: "distance", label: "Distance" },
          { key: "default_duration_time", label: "Duration" },
        ]}
        data={routesView}
        headerActions={
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => openAdd("routes", routeFieldsAdd, "Route")}
          >
            + Add
          </button>
        }
        renderActions={(row) => (
          <>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => openEdit("routes", routeFieldsEdit, "Route", row)}
            >
              Edit
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => deleteRow("routes", row.route_id)}
            >
              Delete
            </button>
          </>
        )}
      />

      {/* TRIPS ==================================================== */}
      <DataTable
        title="Trips"
        columns={[
          { key: "trip_id", label: "Trip ID" },
          { key: "trip_status", label: "Status" },
          { key: "service_date", label: "Service Date" },
          { key: "arrival_datetime", label: "Arrival DateTime" },
          { key: "bus_id", label: "Bus ID" },
          { key: "route_id", label: "Route ID" },
        ]}
        data={tripsView}
        headerActions={
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => openAdd("trips", buildTripFieldsAdd(), "Trip")}
          >
            + Add
          </button>
        }
        renderActions={(row) => (
          <>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => openEdit("trips", tripFieldsEdit, "Trip", row)}
            >
              Edit
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => deleteRow("trips", row.trip_id)}
            >
              Delete
            </button>
          </>
        )}
      />

      {/* BUSES ==================================================== */}
      <DataTable
        title="Buses"
        columns={[
          { key: "bus_id", label: "Bus ID" },
          { key: "plate_number", label: "Plate Number" },
          { key: "capacity", label: "Capacity" },
          { key: "vehicle_type", label: "Vehicle Type" },
          { key: "bus_active_flag", label: "Status" },
          { key: "operator_display", label: "Operator" },
        ]}
        data={busesView}
        headerActions={
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => openAdd("buses", busFieldsAdd, "Bus")}
          >
            + Add
          </button>
        }
        renderActions={(row) => (
          <>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => openEdit("buses", busFieldsEdit, "Bus", row)}
            >
              Edit
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => deleteRow("buses", row.bus_id)}
            >
              Delete
            </button>
          </>
        )}
      />

      {/* STATIONS ================================================= */}
      <DataTable
        title="Stations"
        columns={[
          { key: "station_id", label: "ID" },
          { key: "station_name", label: "Station Name" },
          { key: "city", label: "City" },
          { key: "province", label: "Province" },
          { key: "address_station", label: "Address" },
          { key: "latitude", label: "Latitude" },
          { key: "longtitude", label: "longtitude" },
          { key: "active_flag", label: "Status" },
          { key: "operator_display", label: "Operator" },
        ]}
        data={stationsView}
        headerActions={
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => openAdd("stations", stationFieldsAdd, "Station")}
          >
            + Add
          </button>
        }
        renderActions={(row) => (
          <>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => openEdit("stations", stationFieldsEdit, "Station", row)}
            >
              Edit
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => deleteRow("stations", row.station_id)}
            >
              Delete
            </button>
          </>
        )}
      />

      {/* UNIVERSAL MODAL ========================================== */}
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
    </div>
  );
}

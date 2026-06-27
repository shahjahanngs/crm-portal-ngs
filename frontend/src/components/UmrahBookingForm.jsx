import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  FileText,
  Scan,
  AlertTriangle,
  Upload,
  Plane,
  Hotel,
  Calendar,
  Clock,
  MapPin,
  Users,
  Luggage,
  Utensils,
} from "lucide-react";
import { theme } from "../theme/theme";
import { createUmrahBooking } from "../api/umrahBookingApi";
import { parseMRZ } from "../utils/parseMRZ";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modal: {
    background: "white",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "1400px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "18px 25px",
    background: theme.colors.ublGradient,
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },
  steps: {
    display: "flex",
    padding: "14px 25px",
    borderBottom: "1px solid #e2e8f0",
    gap: "20px",
  },
  formWrap: { flex: 1, overflow: "auto" },
  formContent: { padding: "25px" },
  paxCard: {
    marginBottom: "20px",
    padding: "16px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    background: "#f8fafc",
  },
  paxHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  paxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "7px",
    marginBottom: "8px",
  },
  label: {
    display: "block",
    marginBottom: "3px",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#4a5568",
  },
  input: {
    width: "100%",
    padding: "7px 9px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "0.8rem",
    outline: "none",
    boxSizing: "border-box",
  },
  warn: (bg) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "5px",
    padding: "5px 9px",
    borderRadius: "6px",
    background: bg,
    border: `1px solid ${bg === "#FEE2E2" ? "#FCA5A5" : "#FCD34D"}`,
  }),
  addSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    flexWrap: "wrap",
    gap: "10px",
  },
  reviewCard: {
    padding: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "16px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: "0.88rem",
    color: "#4a5568",
    flexWrap: "wrap",
    gap: "8px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0 0",
    marginTop: "10px",
    borderTop: "2px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "8px",
  },
  paxReview: {
    padding: "10px",
    background: "#f8fafc",
    borderRadius: "8px",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
    flexWrap: "wrap",
  },
  textarea: {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid #cbd5e0",
    borderRadius: "8px",
    fontSize: "0.88rem",
    outline: "none",
    minHeight: "70px",
    resize: "vertical",
    boxSizing: "border-box",
  },
  formBtns: {
    marginTop: "25px",
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
  },
  primary: {
    padding: "10px 26px",
    background: theme.colors.ublGradient,
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  secondary: {
    padding: "10px 26px",
    background: "white",
    color: "#2d3748",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  addBtn: {
    padding: "9px 18px",
    background: "#48bb78",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.88rem",
  },
  delBtn: {
    padding: "7px 13px",
    background: "#f56565",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.82rem",
  },
  mrzBtn: {
    padding: "7px 13px",
    background: "#3B82F6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.82rem",
  },
  mrzModal: {
    background: "white",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "580px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  mrzHeader: {
    padding: "18px 22px",
    background: theme.colors.ublGradient,
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mrzBody: { padding: "22px" },
  mrzInfo: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "10px",
    padding: "11px 14px",
    marginBottom: "18px",
    display: "flex",
    gap: "10px",
  },
  mrzTa: {
    width: "100%",
    padding: "11px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "0.83rem",
    fontFamily: "monospace",
    resize: "vertical",
    outline: "none",
    background: "#F9FAFB",
  },
  mrzErr: {
    marginTop: "7px",
    padding: "9px 11px",
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  mrzBtns: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  mrzCancel: {
    padding: "9px 18px",
    background: "white",
    color: "#4B5563",
    border: "2px solid #E5E7EB",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },
  mrzParse: {
    padding: "9px 22px",
    background: theme.colors.ublGradient,
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
};

const defaultPax = {
  type: "Adult",
  title: "Mr",
  givenName: "",
  surName: "",
  passport: "",
  dateOfBirth: "",
  passportExpiry: "",
  nationality: "Pakistan",
  passportFile: null,
  passportFileName: "",
};

const UmrahBookingForm = ({
  isOpen,
  onClose,
  packageData,
  selectedRoom,
  pricePerPerson,
  user,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const [mrzModal, setMrzModal] = useState({ open: false, index: null });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  const [formData, setFormData] = useState({
    passengers: [{ ...defaultPax }],
    specialRequests: "",
  });

  const setPax = (passengers) => setFormData((f) => ({ ...f, passengers }));

  const handlePaxChange = (i, field, val) => {
    const p = [...formData.passengers];
    p[i][field] = val;
    setPax(p);
  };

  const handlePassportUpload = (i, file) => {
    if (!file) return;
    const p = [...formData.passengers];
    p[i].passportFile = file;
    p[i].passportFileName = file.name;
    setPax(p);
  };

  const addPassenger = () =>
    setPax([...formData.passengers, { ...defaultPax }]);
  const removePassenger = (i) => {
    if (formData.passengers.length > 1)
      setPax(formData.passengers.filter((_, idx) => idx !== i));
  };

  const getPaxPrice = (p) =>
    p.type === "Infant"
      ? packageData?.infantPrice || 0
      : p.type === "Child"
        ? packageData?.childPrice || 0
        : pricePerPerson || 0;
  const totalPrice = () =>
    formData.passengers.reduce((s, p) => s + getPaxPrice(p), 0);

  const checkExpiry = (d) => {
    if (!d) return null;
    const exp = new Date(d),
      today = new Date(),
      soon = new Date();
    soon.setMonth(today.getMonth() + 7);
    if (exp < today)
      return { type: "expired", message: "Passport has expired" };
    if (exp <= soon)
      return {
        type: "warning",
        message:
          "Passport expires within 7 months - may not be eligible for visa",
      };
    return null;
  };

  const calcAge = (dob) => {
    if (!dob) return "Adult";
    const b = dob instanceof Date ? dob : new Date(dob),
      today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const md = today.getMonth() - b.getMonth(),
      dd = today.getDate() - b.getDate();
    if (md < 0 || (md === 0 && dd < 0)) age--;
    const months = age * 12 + md + (dd >= 0 ? 0 : -1);
    return months < 24 ? "Infant" : age < 12 ? "Child" : "Adult";
  };

  const fmtDate = (d) =>
    d instanceof Date && !isNaN(d) ? d.toISOString().split("T")[0] : "";

  const handleMrzParse = () => {
    const blocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];
    if (blocks.length > 1)
      results = blocks.map((b) => parseMRZ(b.trim())).filter(Boolean);
    else {
      const lines = mrzInput
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const r = parseMRZ(lines[i] + "\n" + lines[i + 1]);
        if (r) results.push(r);
      }
    }
    if (!results.length) {
      setMrzError(
        "Invalid MRZ code. Please paste the complete 2-line MRZ from the passport.",
      );
      return;
    }
    const si = mrzModal.index;
    setFormData((prev) => {
      const np = [...prev.passengers];
      results.forEach((r, offset) => {
        const idx = si + offset;
        if (idx >= np.length) return;
        np[idx] = {
          ...np[idx],
          type: r.dateOfBirth ? calcAge(r.dateOfBirth) : np[idx].type,
          surName: r.surName || np[idx].surName,
          givenName: r.givenName || np[idx].givenName,
          passport: r.passport || np[idx].passport,
          nationality: r.nationality || np[idx].nationality,
          dateOfBirth: fmtDate(r.dateOfBirth) || np[idx].dateOfBirth,
          passportExpiry: fmtDate(r.passportExpiry) || np[idx].passportExpiry,
          title: r.title || np[idx].title,
        };
      });
      return { ...prev, passengers: np };
    });
    toast.success(
      `${Math.min(results.length, formData.passengers.length - si)} passport(s) scanned!`,
    );
    setMrzModal({ open: false, index: null });
    setMrzInput("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append(
        "packageId",
        packageData._id ||
          packageData.id ||
          packageData.voucher_id ||
          "PKG-" + Date.now(),
      );
      fd.append(
        "packageName",
        packageData.packageName ||
          packageData.title ||
          packageData.name ||
          "Umrah Package",
      );
      fd.append("packageSource", packageData.packageSource || "zip-accounts");
      fd.append("user", user || "Guest");
      fd.append("roomType", selectedRoom);
      fd.append("specialRequests", formData.specialRequests);
      fd.append("pricing[pricePerPerson]", pricePerPerson);
      fd.append("pricing[currency]", "PKR");
      fd.append("pricing[totalAmount]", totalPrice());
      fd.append("packageData", JSON.stringify(packageData));
      formData.passengers.forEach((p, i) => {
        [
          "type",
          "title",
          "givenName",
          "surName",
          "passport",
          "dateOfBirth",
          "passportExpiry",
          "nationality",
        ].forEach((k) => fd.append(`passengers[${i}][${k}]`, p[k]));
        if (p.passportFile)
          fd.append(
            "passportFiles",
            p.passportFile,
            `passenger-${i}-${p.passportFile.name}`,
          );
      });
      const res = await createUmrahBooking(fd);
      if (res.success) {
        toast.success("Booking submitted! Booking#: " + res.data.bookingNumber);
        onClose();
        setFormData({ passengers: [{ ...defaultPax }], specialRequests: "" });
        setCurrentStep(1);
        setTimeout(() => navigate("/dashboard/umrah-booking"), 1000);
      }
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const flights = packageData?.flights || packageData?.metadata?.flights || [];
  const hotels = packageData?.hotels || packageData?.metadata?.hotels || [];
  const [out, inb] = flights;
  const pkgName =
    packageData?.packageName || packageData?.title || packageData?.name;

  const FlightChip = ({ f }) =>
    f ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "7px 10px",
          background: "white",
          borderRadius: "7px",
          border: "1px solid #e2e8f0",
          fontSize: "0.78rem",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <span style={{ fontWeight: 700 }}>
          {f.sector?.split("-")[0]} → {f.sector?.split("-")[1]}
        </span>
        <span style={{ color: "#718096" }}>
          <Calendar size={11} style={{ display: "inline", marginRight: 3 }} />
          {new Date(f.departureDate).toLocaleDateString()}
        </span>
        <span style={{ color: "#718096" }}>
          <Clock size={11} style={{ display: "inline", marginRight: 3 }} />
          {new Date(f.departureDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span style={{ color: "#718096" }}>{f.flightNumber}</span>
        <span style={{ color: "#718096" }}>
          <Luggage size={11} style={{ display: "inline", marginRight: 2 }} />
          {f.baggage}
        </span>
      </div>
    ) : null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(1.1rem,4vw,1.4rem)",
                fontWeight: 700,
              }}
            >
              Comfirm your Umrah Booking Package
            </h2>
            <p style={{ margin: "3px 0 0", opacity: 0.9, fontSize: "0.85rem" }}>
              {pkgName} — {selectedRoom} Room
            </p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            <X size={22} />
          </button>
        </div>

        {/* Compact Package Summary */}
        <div
          style={{
            margin: "12px 22px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #86EFAC",
            background: "#F0FDF4",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Flights */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                flexWrap: "wrap",
              }}
            >
              <Plane size={14} color="#166534" />
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#166534",
                  marginRight: 3,
                }}
              >
                Flights:
              </span>
              <FlightChip f={out} />
              {inb && (
                <>
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    ↔
                  </span>
                  <FlightChip f={inb} />
                </>
              )}
            </div>
            {/* Divider */}
            {hotels.length > 0 && (
              <div style={{ width: 1, height: 28, background: "#86EFAC" }} />
            )}
            {/* Hotels */}
            {hotels.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  flexWrap: "wrap",
                }}
              >
                <Hotel size={14} color="#166534" />
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#166534",
                    marginRight: 3,
                  }}
                >
                  Hotels:
                </span>
                {hotels.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 9px",
                      background: "white",
                      borderRadius: "7px",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.78rem",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{h.name}</span>
                    <span style={{ color: "#F59E0B" }}>★{h.rating}</span>
                    <span style={{ color: "#718096" }}>
                      <MapPin
                        size={10}
                        style={{ display: "inline", marginRight: 2 }}
                      />
                      {h.location?.distance}m
                    </span>
                    {h.nights && (
                      <span style={{ color: "#718096" }}>{h.nights}n</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          {[
            ["Passenger Details", 1],
            ["Review & Submit", 2],
          ].map(([label, n]) => (
            <div
              key={n}
              onClick={() => setCurrentStep(n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                opacity: currentStep === n ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background:
                    currentStep === n ? theme.colors.ublGradient : "#cbd5e0",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                {n}
              </div>
              <span
                style={{
                  fontWeight: currentStep === n ? 600 : 400,
                  color: currentStep === n ? "#2d3748" : "#718096",
                  fontSize: "0.88rem",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.formWrap}>
          <div style={s.formContent}>
            {currentStep === 1 && (
              <div>
                {formData.passengers.map((pax, i) => {
                  const expWarn = checkExpiry(pax.passportExpiry);
                  return (
                    <div key={i} style={s.paxCard}>
                      <div style={s.paxHeader}>
                        <h4
                          style={{
                            margin: 0,
                            color: "#2d3748",
                            fontWeight: 600,
                            fontSize: "0.95rem",
                          }}
                        >
                          Passenger {i + 1}
                        </h4>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setMrzModal({ open: true, index: i });
                              setMrzInput("");
                              setMrzError("");
                            }}
                            style={s.mrzBtn}
                          >
                            <Scan size={14} /> MRZ Scan
                          </button>
                          {formData.passengers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePassenger(i)}
                              style={s.delBtn}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={s.paxGrid}>
                        {[
                          {
                            label: "Type *",
                            key: "type",
                            type: "select",
                            opts: ["Adult", "Child", "Infant"],
                          },
                          {
                            label: "Title *",
                            key: "title",
                            type: "select",
                            opts: ["Mr", "Mrs", "Ms", "Miss", "Dr"],
                          },
                          {
                            label: "Given Name *",
                            key: "givenName",
                            type: "text",
                            placeholder: "First name",
                          },
                          {
                            label: "Surname *",
                            key: "surName",
                            type: "text",
                            placeholder: "Last name",
                          },
                          {
                            label: "Passport *",
                            key: "passport",
                            type: "text",
                            placeholder: "AA1234567",
                          },
                          { label: "DOB *", key: "dateOfBirth", type: "date" },
                          {
                            label: "Nationality *",
                            key: "nationality",
                            type: "text",
                          },
                          {
                            label: "Expiry *",
                            key: "passportExpiry",
                            type: "date",
                            min: (() => {
                              const d = new Date();
                              d.setMonth(d.getMonth() + 6);
                              d.setDate(d.getDate() + 1);
                              return d.toISOString().split("T")[0];
                            })(),
                          },
                        ].map(({ label, key, type, opts, placeholder, min }) => (
                          <div key={key}>
                            <label style={s.label}>{label}</label>
                            {type === "select" ? (
                              <select
                                required
                                value={pax[key]}
                                onChange={(e) =>
                                  handlePaxChange(i, key, e.target.value)
                                }
                                style={s.input}
                              >
                                {opts.map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={type}
                                required
                                min={min}
                                value={pax[key]}
                                placeholder={placeholder}
                                onChange={(e) =>
                                  handlePaxChange(
                                    i,
                                    key,
                                    key === "passport"
                                      ? e.target.value.toUpperCase()
                                      : e.target.value,
                                  )
                                }
                                style={s.input}
                              />
                            )}
                          </div>
                        ))}
                        <div>
                          <label style={s.label}>Passport File</label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) =>
                              handlePassportUpload(i, e.target.files[0])
                            }
                            style={{ display: "none" }}
                            id={`pu-${i}`}
                          />
                          <label
                            htmlFor={`pu-${i}`}
                            style={{
                              ...s.input,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              cursor: "pointer",
                              color: "#718096",
                              background: pax.passportFileName
                                ? "#F0FDF4"
                                : "white",
                            }}
                          >
                            <Upload size={13} />{" "}
                            {pax.passportFileName ? "✓ Uploaded" : "Upload"}
                          </label>
                        </div>
                      </div>
                      {expWarn && (
                        <div
                          style={s.warn(
                            expWarn.type === "expired" ? "#FEE2E2" : "#FEF3C7",
                          )}
                        >
                          <AlertTriangle
                            size={12}
                            color={
                              expWarn.type === "expired" ? "#DC2626" : "#D97706"
                            }
                          />
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color:
                                expWarn.type === "expired"
                                  ? "#DC2626"
                                  : "#D97706",
                              fontWeight: 500,
                            }}
                          >
                            {expWarn.message}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={s.addSection}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "#2d3748",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <FileText size={18} /> Passenger Details (
                    {formData.passengers.length})
                  </h3>
                  <button type="button" onClick={addPassenger} style={s.addBtn}>
                    <Plus size={15} /> Add Passenger
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={s.primary}
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h3
                  style={{
                    marginBottom: "18px",
                    fontSize: "1.1rem",
                    color: "#2d3748",
                  }}
                >
                  Review Your Booking
                </h3>
                <div style={s.reviewCard}>
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontWeight: 700,
                      color: "#2d3748",
                      borderBottom: "2px solid #e2e8f0",
                      paddingBottom: "8px",
                    }}
                  >
                    Package Details
                  </h4>
                  {[
                    ["Package", pkgName],
                    ["Room Type", selectedRoom],
                    ["Adult Price", `PKR ${pricePerPerson?.toLocaleString()}`],
                  ].map(([k, v]) => (
                    <div key={k} style={s.row}>
                      <span>{k}:</span>
                      <strong style={{ textTransform: "capitalize" }}>
                        {v}
                      </strong>
                    </div>
                  ))}
                  {formData.passengers.some((p) => p.type === "Child") && (
                    <div style={s.row}>
                      <span>Child Price:</span>
                      <strong>
                        PKR {(packageData?.childPrice || 0).toLocaleString()}
                      </strong>
                    </div>
                  )}
                  {formData.passengers.some((p) => p.type === "Infant") && (
                    <div style={s.row}>
                      <span>Infant Price:</span>
                      <strong>
                        PKR {(packageData?.infantPrice || 0).toLocaleString()}
                      </strong>
                    </div>
                  )}
                  <div style={s.row}>
                    <span>Total Passengers:</span>
                    <strong>{formData.passengers.length}</strong>
                  </div>
                  <div style={s.totalRow}>
                    <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                      Total Amount:
                    </span>
                    <strong
                      style={{
                        fontSize: "1.2rem",
                        color: theme.colors.success,
                      }}
                    >
                      PKR {totalPrice().toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div style={s.reviewCard}>
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontWeight: 700,
                      color: "#2d3748",
                      borderBottom: "2px solid #e2e8f0",
                      paddingBottom: "8px",
                    }}
                  >
                    Passengers
                  </h4>
                  {formData.passengers.map((p, i) => (
                    <div key={i} style={s.paxReview}>
                      <div>
                        <strong>
                          {i + 1}. {p.title}. {p.givenName} {p.surName}
                        </strong>
                        <div
                          style={{
                            fontSize: "0.83rem",
                            color: "#718096",
                            marginTop: "4px",
                          }}
                        >
                          {p.type} | Passport: {p.passport} | DOB:{" "}
                          {p.dateOfBirth}
                        </div>
                      </div>
                      <strong style={{ whiteSpace: "nowrap" }}>
                        PKR {getPaxPrice(p).toLocaleString()}
                      </strong>
                    </div>
                  ))}
                </div>

                <div>
                  <label
                    style={{
                      ...s.label,
                      fontSize: "0.85rem",
                      marginBottom: "6px",
                    }}
                  >
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        specialRequests: e.target.value,
                      }))
                    }
                    style={s.textarea}
                    placeholder="Any special requests or notes..."
                  />
                </div>

                <div style={s.formBtns}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    style={s.secondary}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...s.primary,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Submitting..." : "Confirm Booking ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* MRZ Modal */}
      {mrzModal.open && (
        <div
          style={s.overlay}
          onClick={() => setMrzModal({ open: false, index: null })}
        >
          <div style={s.mrzModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.mrzHeader}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "7px",
                    borderRadius: "9px",
                  }}
                >
                  <Scan size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>
                    Passport MRZ Scanner
                  </h4>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: "0.82rem" }}>
                    Passenger {(mrzModal.index || 0) + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMrzModal({ open: false, index: null })}
                style={{
                  ...s.closeBtn,
                  borderRadius: "8px",
                  width: 30,
                  height: 30,
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={s.mrzBody}>
              <div style={s.mrzInfo}>
                <AlertTriangle size={15} color="#2563EB" />
                <div
                  style={{
                    fontSize: "0.83rem",
                    color: "#1E40AF",
                    lineHeight: 1.5,
                  }}
                >
                  💡 The MRZ is the two machine-readable lines at the bottom of
                  the passport. Paste each passenger's MRZ (separated by blank
                  lines) to auto-fill multiple passengers.
                </div>
              </div>
              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Paste MRZ Code
              </label>
              <textarea
                autoFocus
                value={mrzInput}
                onChange={(e) => {
                  setMrzInput(e.target.value);
                  setMrzError("");
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === "Enter") handleMrzParse();
                }}
                placeholder={`P<PAKNAME<<GIVEN<NAME<<<<<<<<<<<<<<<<<<<<<\nAB1234567PAK8501011M2601014<<<<<<<<<<<<<<<6`}
                rows={5}
                style={s.mrzTa}
              />
              {mrzError && (
                <div style={s.mrzErr}>
                  <AlertTriangle size={13} color="#DC2626" />
                  <span style={{ fontSize: "0.83rem", color: "#DC2626" }}>
                    {mrzError}
                  </span>
                </div>
              )}
              <div style={s.mrzBtns}>
                <button
                  type="button"
                  onClick={() => setMrzModal({ open: false, index: null })}
                  style={s.mrzCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMrzParse}
                  style={s.mrzParse}
                >
                  <Scan size={15} /> Parse MRZ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UmrahBookingForm;

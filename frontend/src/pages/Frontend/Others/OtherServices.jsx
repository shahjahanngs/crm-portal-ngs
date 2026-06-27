import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axios";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { Settings } from "lucide-react";
import { toast } from "react-toastify";
import { parseMRZ } from "../../../utils/parseMRZ";

const DURATION_LABELS = { 14: "14 Days", 21: "21 Days", 28: "28 Days" };

const passengerTypes = ["adult", "child", "infant"];

export default function OtherServices() {
  const [selectedService, setSelectedService] = useState("visa");
  const [visaPackages, setVisaPackages] = useState([]);
  const [hotelPackages, setHotelPackages] = useState([]);
  const [transportPackages, setTransportPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [transport, setTransport] = useState("withTransport");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: "",
    email: "",
    phone: "",
    adults: 1,
    children: 0,
    infants: 0,
    notes: "",
    // Visa specific
    duration: "",
    // Hotel specific
    roomType: "",
    checkIn: "",
    checkOut: "",
    numberOfRooms: 1,
    // Transport specific
    numberOfPax: 1,
    // Passengers
    passengers: [],
  });
  const [mrzModal, setMrzModal] = useState({ open: false, index: null });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchVisaPkgs = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/zip-accounts/visa-packages");
      const data = res.data?.data || [];
      setVisaPackages(data);
    } catch (err) {
      setError("Failed to load visa packages.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportPkgs = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/zip-accounts/transport-packages");
      const data = res.data?.data || [];
      setTransportPackages(data);
    } catch (err) {
      setError("Failed to load transport packages.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHotelPkgs = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/zip-accounts/hotel-packages");
      const data = res.data?.data || [];
      setHotelPackages(data);
    } catch (err) {
      setError("Failed to load hotel packages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedService === "visa") {
      fetchVisaPkgs();
    } else if (selectedService === "transport") {
      fetchTransportPkgs();
    } else if (selectedService === "hotel") {
      fetchHotelPkgs();
    }
  }, [selectedService]);

  const handleServiceChange = (service) => {
    setSelectedService(service);
    setError(null);
    setSelectedPkg(null);
  };

  const getCurrentPackages = () => {
    if (selectedService === "visa") return visaPackages;
    if (selectedService === "transport") return transportPackages;
    if (selectedService === "hotel") return hotelPackages;
    return [];
  };

  const getServiceTitle = () => {
    if (selectedService === "visa") return "Visa";
    if (selectedService === "transport") return "Transport";
    if (selectedService === "hotel") return "Hotel";
    return "";
  };

  const getRetryFunction = () => {
    if (selectedService === "visa") return fetchVisaPkgs;
    if (selectedService === "transport") return fetchTransportPkgs;
    if (selectedService === "hotel") return fetchHotelPkgs;
    return fetchVisaPkgs;
  };

  const formatCurrency = (amount) =>
    amount === 0 ? "—" : `PKR ${amount.toLocaleString()}`;

  const getDurations = (pkg) =>
    pkg ? Object.keys(pkg.pricing).sort((a, b) => a - b) : [];

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => {
      const updated = { ...prev, [name]: value };
      // Update passengers array when counts change
      if (name === "adults" || name === "children" || name === "infants") {
        const totalPax =
          parseInt(name === "adults" ? value : updated.adults || 0) +
          parseInt(name === "children" ? value : updated.children || 0) +
          parseInt(name === "infants" ? value : updated.infants || 0);

        // For transport, numberOfPax is auto-calculated from passengers
        if (selectedService === "transport") {
          updated.numberOfPax = totalPax;
        }

        const currentPax = updated.passengers.length;
        if (totalPax > currentPax) {
          // Add new passengers
          const newPassengers = [...updated.passengers];
          for (let i = currentPax; i < totalPax; i++) {
            newPassengers.push({
              fullName: "",
              passportNumber: "",
              passportExpiry: "",
              type:
                i < parseInt(updated.adults || 0)
                  ? "adult"
                  : i <
                    parseInt(updated.adults || 0) +
                    parseInt(updated.children || 0)
                    ? "child"
                    : "infant",
            });
          }
          updated.passengers = newPassengers;
        } else if (totalPax < currentPax) {
          // Remove extra passengers
          updated.passengers = updated.passengers.slice(0, totalPax);
        }
      }
      return updated;
    });
  };

  const handlePassengerChange = (index, field, value) => {
    setBookingData((prev) => {
      const updatedPassengers = [...prev.passengers];
      updatedPassengers[index] = {
        ...updatedPassengers[index],
        [field]: value,
      };
      return { ...prev, passengers: updatedPassengers };
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        type:
          selectedService === "visa"
            ? "Visa"
            : selectedService === "hotel"
              ? "Hotel"
              : "Transport",
        packageId: selectedPkg._id,
        packageName:
          selectedPkg.visaName ||
          selectedPkg.hotelName ||
          selectedPkg.name ||
          selectedPkg.packageName,
        originalPkg: selectedPkg,
        contactInfo: {
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
        },
        passengers: bookingData.passengers,
        notes: bookingData.notes,
      };

      // Add service-specific data
      if (selectedService === "visa") {
        payload.duration = bookingData.duration;
        payload.transportMode = transport;

        // Compute totalPrice from pricing × passenger counts
        const prices =
          selectedPkg.pricing?.[bookingData.duration]?.[transport] || {};
        const adultTotal =
          (prices.adult?.selling ?? 0) * (parseInt(bookingData.adults) || 0);
        const childTotal =
          (prices.child?.selling ?? 0) * (parseInt(bookingData.children) || 0);
        const infantTotal =
          (prices.infant?.selling ?? 0) * (parseInt(bookingData.infants) || 0);
        payload.totalPrice = adultTotal + childTotal + infantTotal;
        payload.currency = "PKR";
      } else if (selectedService === "hotel") {
        payload.roomType = bookingData.roomType;
        payload.checkIn = bookingData.checkIn;
        payload.checkOut = bookingData.checkOut;
        payload.numberOfRooms = bookingData.numberOfRooms;

        // Compute totalPrice from selected room rate × rooms
        const selectedRate = selectedPkg.rates?.find(
          (r) => r._id === bookingData.roomType,
        );
        payload.totalPrice =
          (selectedRate?.sellingRate ?? 0) *
          (parseInt(bookingData.numberOfRooms) || 1);
        payload.currency = "PKR";
      } else if (selectedService === "transport") {
        payload.numberOfPax = bookingData.numberOfPax;

        // Compute totalPrice from selling rate × pax
        payload.totalPrice =
          (selectedPkg.selling ?? 0) * (parseInt(bookingData.numberOfPax) || 1);
        payload.currency = "PKR";
      }

      const response = await axiosInstance.post(
        "/zip-accounts/submit-booking",
        payload,
      );

      if (response.data.success) {
        toast.success(`Booking submitted successfully!`);
        setShowBookingModal(false);
        resetBookingForm();
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(
        error.response?.data?.message ||
        "Failed to submit booking. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetBookingForm = () => {
    setBookingData({
      name: "",
      email: "",
      phone: "",
      adults: 1,
      children: 0,
      infants: 0,
      notes: "",
      duration: "",
      roomType: "",
      checkIn: "",
      checkOut: "",
      numberOfRooms: 1,
      numberOfPax: 1,
      passengers: [],
    });
  };

  const openBookingModal = (pkg, preselectedDuration = null, preselectedRoomId = null) => {
    setSelectedPkg(pkg);
    // Initialize with one adult passenger by default
    const initialData = {
      name: "",
      email: "",
      phone: "",
      adults: 1,
      children: 0,
      infants: 0,
      notes: "",
      duration: "",
      roomType: "",
      checkIn: "",
      checkOut: "",
      numberOfRooms: 1,
      numberOfPax: 1,
      passengers: [
        {
          fullName: "",
          passportNumber: "",
          passportExpiry: "",
          type: "adult",
        },
      ],
    };

    // Set default duration for visa if available
    if (selectedService === "visa" && pkg.pricing) {
      const durations = Object.keys(pkg.pricing).sort((a, b) => a - b);
      if (preselectedDuration) {
        initialData.duration = String(preselectedDuration);
      } else if (durations.length > 0) {
        initialData.duration = durations[0];
      }
    }

    // Set default room type for hotel if available
    if (selectedService === "hotel" && pkg.rates) {
      const activeRates = pkg.rates.filter((r) => r.active);
      if (preselectedRoomId) {
        initialData.roomType = preselectedRoomId;
      } else if (activeRates.length > 0) {
        initialData.roomType = activeRates[0]._id;
      }
    }

    setBookingData(initialData);
    setShowBookingModal(true);
  };

  const handleMrzScan = (index) => {
    setMrzModal({ open: true, index });
    setMrzInput("");
    setMrzError("");
  };

  const handleMrzParse = () => {
    const rawBlocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];

    if (rawBlocks.length > 1) {
      results = rawBlocks
        .map((block) => parseMRZ(block.trim()))
        .filter(Boolean);
    } else {
      const lines = mrzInput
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const result = parseMRZ(lines[i] + "\n" + lines[i + 1]);
        if (result) results.push(result);
      }
    }

    if (results.length === 0) {
      setMrzError(
        "Invalid MRZ code. Please paste the complete 2-line MRZ from the passport.",
      );
      return;
    }

    const formatDateForInput = (date) => {
      if (!date) return "";
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
      return "";
    };

    const startIdx = mrzModal.index;
    setBookingData((prev) => {
      const newPassengers = [...prev.passengers];
      results.forEach((result, offset) => {
        const idx = startIdx + offset;
        if (idx >= newPassengers.length) return;
        newPassengers[idx] = {
          ...newPassengers[idx],
          fullName:
            `${result.givenName || ""} ${result.surName || ""}`.trim() ||
            newPassengers[idx].fullName,
          passportNumber: result.passport || newPassengers[idx].passportNumber,
          passportExpiry:
            formatDateForInput(result.passportExpiry) ||
            newPassengers[idx].passportExpiry,
        };
      });
      return { ...prev, passengers: newPassengers };
    });

    const filled = Math.min(
      results.length,
      bookingData.passengers.length - startIdx,
    );
    toast.success(
      `${filled} passport${filled > 1 ? "s" : ""} scanned successfully!`,
    );
    setMrzModal({ open: false, index: null });
    setMrzInput("");
  };

  return (
    <div style={styles.page}>
      <TopBar
        title={"Other Services"}
        icon={<Settings className="text-white w-6 h-6" />}
      />
      {/* Service Capsules */}
      <div style={styles.capsulesContainer}>
        <button
          style={{
            ...styles.capsule,
            ...(selectedService === "visa" ? styles.capsuleActive : {}),
          }}
          onClick={() => handleServiceChange("visa")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 8 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Visa Services
        </button>
        <button
          style={{
            ...styles.capsule,
            ...(selectedService === "transport" ? styles.capsuleActive : {}),
          }}
          onClick={() => handleServiceChange("transport")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 8 }}
          >
            <path d="M5 17h-2v-6l2-1v7z" />
            <path d="M20 17h1v-6l-1-1v7z" />
            <path d="M4 11v-6l16-1v7" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          Transport Services
        </button>
        <button
          style={{
            ...styles.capsule,
            ...(selectedService === "hotel" ? styles.capsuleActive : {}),
          }}
          onClick={() => handleServiceChange("hotel")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 8 }}
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Hotel Services
        </button>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.headerSub}>{getServiceTitle()} Management</p>
          <h1 style={styles.headerTitle}>{getServiceTitle()} Packages</h1>
        </div>
        <span style={styles.badge}>
          {getCurrentPackages().length} Package
          {getCurrentPackages().length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div style={styles.centerBox}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading packages...</p>
        </div>
      )}

      {error && !loading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryBtn} onClick={getRetryFunction()}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && getCurrentPackages().length === 0 && (
        <div style={styles.centerBox}>
          <p style={styles.emptyText}>
            No {getServiceTitle().toLowerCase()} packages found.
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        getCurrentPackages().length > 0 &&
        selectedService === "visa" && (
          <>
            {!selectedPkg ? (
              // Grid view of all packages
              <div style={styles.gridContainer}>
                {visaPackages.map((pkg) => (
                  <div key={pkg._id} style={styles.gridCard}>
                    <div
                      style={styles.gridCardClickable}
                      onClick={() => setSelectedPkg(pkg)}
                    >
                      <div style={styles.gridCardIcon}>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div style={styles.gridCardHeader}>
                        <span style={styles.gridCardFlag}>
                          {pkg.visaCountry}
                        </span>
                        <span
                          style={{
                            ...styles.gridCardDot,
                            background: pkg.isDeleted
                              ? theme.colors.danger
                              : theme.colors.success,
                          }}
                        />
                      </div>
                      <h3 style={styles.gridCardTitle}>{pkg.visaName}</h3>
                      <p style={styles.gridCardDoc}>{pkg.documentNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Detail view
              <div style={styles.detailContainer}>
                <button
                  style={styles.backBtn}
                  onClick={() => setSelectedPkg(null)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Packages
                </button>

                <div style={styles.detailCard}>
                  <div style={styles.metaRow}>
                    <div>
                      <h2 style={styles.detailTitle}>
                        {selectedPkg.visaName} Visa &mdash;{" "}
                        {selectedPkg.visaCountry}
                      </h2>
                      <p style={styles.detailSub}>
                        Document No:{" "}
                        <strong>{selectedPkg.documentNumber}</strong>
                      </p>
                    </div>
                    <div style={styles.metaRight}>
                      <div style={styles.infoChip}>
                        Created:{" "}
                        {new Date(selectedPkg.createdAt).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </div>
                      <div
                        style={{
                          ...styles.infoChip,
                          color: selectedPkg.isDeleted
                            ? theme.colors.danger
                            : theme.colors.success,
                          borderColor: selectedPkg.isDeleted
                            ? theme.colors.danger
                            : theme.colors.success,
                        }}
                      >
                        {selectedPkg.isDeleted ? "Inactive" : "Active"}
                      </div>
                      <button
                        style={styles.bookBtnDetail}
                        onClick={() => openBookingModal(selectedPkg)}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginRight: 6 }}
                        >
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                        Book Now
                      </button>
                    </div>
                  </div>

                  <div style={styles.toggleRow}>
                    <p style={styles.sectionLabel}>Pricing Mode</p>
                    <div style={styles.toggleWrap}>
                      {["withTransport", "withoutTransport"].map((t) => (
                        <button
                          key={t}
                          style={{
                            ...styles.toggleBtn,
                            ...(transport === t ? styles.toggleBtnActive : {}),
                          }}
                          onClick={() => setTransport(t)}
                        >
                          {t === "withTransport"
                            ? "With Transport"
                            : "Without Transport"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compact Card-Based Pricing Layout */}
                  <div style={styles.pricingGrid}>
                    {getDurations(selectedPkg).map((dur) => {
                      const prices =
                        selectedPkg.pricing[dur]?.[transport] || {};
                      return (
                        <div key={dur} style={styles.pricingCard}>
                          <div style={styles.pricingCardHeader}>
                            <span style={styles.durationLabel}>
                              {DURATION_LABELS[dur] || `${dur} Days`}
                            </span>
                          </div>
                          <div style={styles.pricingCardBody}>
                            {passengerTypes.map((type) => {
                              const s = prices[type]?.selling ?? 0;
                              return (
                                <div key={type} style={styles.priceRow}>
                                  <div style={styles.priceLabel}>
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      style={{ marginRight: 6, opacity: 0.6 }}
                                    >
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                      <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span style={styles.passengerLabel}>
                                      {type.charAt(0).toUpperCase() +
                                        type.slice(1)}
                                    </span>
                                  </div>
                                  <span style={styles.priceAmount}>
                                    {formatCurrency(s)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ padding: "0 12px 12px" }}>
                            <button
                              style={styles.bookBtn}
                              onClick={() => openBookingModal(selectedPkg, dur)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ marginRight: 6 }}
                              >
                                <path d="M9 11l3 3L22 4" />
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                              </svg>
                              Book {DURATION_LABELS[dur] || `${dur} Days`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      {/* Transport Packages View */}
      {!loading &&
        !error &&
        getCurrentPackages().length > 0 &&
        selectedService === "transport" && (
          <>
            {!selectedPkg ? (
              // Grid view
              <div style={styles.gridContainer}>
                {transportPackages.map((pkg) => (
                  <div key={pkg._id} style={styles.gridCard}>
                    <div
                      style={styles.gridCardClickable}
                      onClick={() => setSelectedPkg(pkg)}
                    >
                      <div style={styles.gridCardIcon}>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 17h-2v-6l2-1v7z" />
                          <path d="M20 17h1v-6l-1-1v7z" />
                          <path d="M4 11v-6l16-1v7" />
                          <circle cx="7" cy="17" r="2" />
                          <circle cx="17" cy="17" r="2" />
                        </svg>
                      </div>
                      <div style={styles.gridCardHeader}>
                        <span style={styles.gridCardFlag}>
                          {pkg.transportType}
                        </span>
                      </div>
                      <h3 style={styles.gridCardTitle}>{pkg.sector}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Detail view
              <div style={styles.detailContainer}>
                <button
                  style={styles.backBtn}
                  onClick={() => setSelectedPkg(null)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Packages
                </button>

                <div style={styles.detailCard}>
                  <div style={styles.metaRow}>
                    <div>
                      <h2 style={styles.detailTitle}>
                        {selectedPkg.transportType} - {selectedPkg.sector}
                      </h2>
                    </div>
                    <div style={styles.metaRight}>
                      <div style={styles.infoChip}>
                        Valid:{" "}
                        {new Date(selectedPkg.startDate).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short" },
                        )}{" "}
                        -{" "}
                        {new Date(selectedPkg.endDate).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </div>
                      <button
                        style={styles.bookBtnDetail}
                        onClick={() => openBookingModal(selectedPkg)}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginRight: 6 }}
                        >
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                        Book Now
                      </button>
                    </div>
                  </div>

                  {/* Compact Transport Info Cards */}
                  <div style={styles.transportInfoGrid}>
                    <div style={styles.transportInfoCard}>
                      <div style={styles.transportIconWrapper}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="6"
                            width="18"
                            height="12"
                            rx="2"
                            ry="2"
                          />
                          <path d="M3 10h18" />
                        </svg>
                      </div>
                      <div style={styles.transportInfoContent}>
                        <span style={styles.transportInfoLabel}>Price</span>
                        <span style={styles.transportPriceValue}>
                          {formatCurrency(selectedPkg.selling)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      {/* Hotel Packages View */}
      {!loading &&
        !error &&
        getCurrentPackages().length > 0 &&
        selectedService === "hotel" && (
          <>
            {!selectedPkg ? (
              // Grid view
              <div style={styles.gridContainer}>
                {hotelPackages.map((pkg) => (
                  <div key={pkg._id} style={styles.gridCard}>
                    <div
                      style={styles.gridCardClickable}
                      onClick={() => setSelectedPkg(pkg)}
                    >
                      <div style={styles.gridCardIcon}>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                      <div style={styles.gridCardHeader}>
                        <span style={styles.gridCardFlag}>
                          {new Date(pkg.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          {" — "}
                          {new Date(pkg.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span
                          style={{
                            ...styles.gridCardDot,
                            background: pkg.active
                              ? theme.colors.success
                              : theme.colors.danger,
                          }}
                        />
                      </div>
                      <h3 style={styles.gridCardTitle}>{pkg.hotelName}</h3>
                      <p style={styles.gridCardDoc}>{pkg.supplierName}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Detail view
              <div style={styles.detailContainer}>
                <button
                  style={styles.backBtn}
                  onClick={() => setSelectedPkg(null)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Packages
                </button>

                <div style={styles.detailCard}>
                  <div style={styles.metaRow}>
                    <div>
                      <h2 style={styles.detailTitle}>
                        {selectedPkg.hotelName}
                      </h2>
                      <p style={styles.detailSub}>
                        Supplier:{" "}
                        <strong>{selectedPkg.supplierName}</strong>
                      </p>
                    </div>
                    <div style={styles.metaRight}>
                      <div style={styles.infoChip}>
                        Valid:{" "}
                        {new Date(selectedPkg.startDate).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short" },
                        )}{" "}
                        -{" "}
                        {new Date(selectedPkg.endDate).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </div>
                      <div style={styles.infoChip}>
                        Buying ROE: {selectedPkg.buyingROE} {selectedPkg.buyingCurrency}
                      </div>
                      <div style={styles.infoChip}>
                        Selling ROE: {selectedPkg.sellingROE} {selectedPkg.sellingCurrency}
                      </div>
                      <div
                        style={{
                          ...styles.infoChip,
                          color: selectedPkg.active
                            ? theme.colors.success
                            : theme.colors.danger,
                          borderColor: selectedPkg.active
                            ? theme.colors.success
                            : theme.colors.danger,
                        }}
                      >
                        {selectedPkg.active ? "Active" : "Inactive"}
                      </div>
                      <button
                        style={styles.bookBtnDetail}
                        onClick={() => openBookingModal(selectedPkg)}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginRight: 6 }}
                        >
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                        Book Now
                      </button>
                    </div>
                  </div>

                  {/* Compact Hotel Room Cards */}
                  <div style={styles.hotelRoomGrid}>
                    {selectedPkg.rates
                      ?.filter((rate) => rate.active)
                      .map((rate) => {
                        const roomRange = selectedPkg.roomRanges?.find(
                          (r) => r.roomTypeId === rate.roomTypeId,
                        );
                        return (
                          <div key={rate._id} style={styles.hotelRoomCard}>
                            <div style={styles.hotelRoomHeader}>
                              <div style={styles.hotelRoomIcon}>
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                  <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                              </div>
                              <span style={styles.hotelRoomName}>
                                {rate.name}
                              </span>
                            </div>
                            <div style={styles.hotelRoomBody}>
                              {/* Selling Rates */}
                              <div style={{ ...styles.hotelRateSection, marginTop: 8 }}>
                                <span style={styles.hotelRateSectionLabel}>Selling Rate</span>
                                <div style={styles.hotelRatePair}>
                                  <div style={styles.hotelRateItem}>
                                    <span style={styles.hotelPriceLabel}>{selectedPkg.sellingCurrency}</span>
                                    <span style={{ ...styles.hotelPriceValue, color: theme.colors.success }}>{rate.foreignSellingRate} {selectedPkg.sellingCurrency}</span>
                                  </div>
                                  <div style={styles.hotelRateItem}>
                                    <span style={styles.hotelPriceLabel}>PKR</span>
                                    <span style={{ ...styles.hotelPriceValue, color: theme.colors.success }}>{formatCurrency(rate.sellingRate)}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Room Range & Floor */}
                              <div style={{ ...styles.hotelRoomDetails, marginTop: 10 }}>
                                <div style={styles.hotelDetailItem}>
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ marginRight: 6, opacity: 0.6 }}
                                  >
                                    <path d="M9 11l3 3L22 4" />
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                  </svg>
                                  <span style={styles.hotelDetailLabel}>
                                    Rooms:
                                  </span>
                                  <span style={styles.hotelDetailValue}>
                                    {roomRange
                                      ? `${roomRange.from} - ${roomRange.to}`
                                      : "—"}
                                  </span>
                                </div>
                                <div style={styles.hotelDetailItem}>
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ marginRight: 6, opacity: 0.6 }}
                                  >
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                  </svg>
                                  <span style={styles.hotelDetailLabel}>
                                    Floor:
                                  </span>
                                  <span style={styles.hotelDetailValue}>
                                    {roomRange ? roomRange.floor : "—"}
                                  </span>
                                </div>
                              </div>
                              {/* Book button per room */}
                              <div style={{ paddingTop: 12 }}>
                                <button
                                  style={styles.bookBtn}
                                  onClick={() => openBookingModal(selectedPkg, null, rate._id)}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ marginRight: 6 }}
                                  >
                                    <path d="M9 11l3 3L22 4" />
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                  </svg>
                                  Book {rate.name}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      {/* MRZ Scan Modal */}
      {mrzModal.open && (
        <div
          style={{ ...styles.modalOverlay, zIndex: 1100 }}
          onClick={() => setMrzModal({ open: false, index: null })}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 540,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: theme.colors.sidebarBg,
                }}
              >
                MRZ Scan — Passenger {(mrzModal.index ?? 0) + 1}
              </h3>
              <button
                style={styles.modalClose}
                onClick={() => setMrzModal({ open: false, index: null })}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p
              style={{
                fontSize: 13,
                color: theme.colors.secondary,
                marginBottom: 12,
              }}
            >
              Paste the 2-line MRZ code from the bottom of the passport. You can
              paste multiple passports separated by a blank line to fill
              multiple passengers at once.
            </p>
            <textarea
              value={mrzInput}
              onChange={(e) => {
                setMrzInput(e.target.value);
                setMrzError("");
              }}
              style={{
                ...styles.textarea,
                fontFamily: "monospace",
                fontSize: 13,
                background: "#f8fafc",
                minHeight: 90,
              }}
              rows={4}
              placeholder={
                "P<PAKNAME<<GIVEN<<<<<<<<<<<<<<<<<<<<<<<<<<\nAB1234567PAK8501011M2601011<<<<<<<<<<<<<<<4"
              }
              autoFocus
            />
            {mrzError && (
              <p
                style={{
                  color: theme.colors.danger,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                {mrzError}
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                style={styles.cancelBtn}
                onClick={() => setMrzModal({ open: false, index: null })}
              >
                Cancel
              </button>
              <button
                style={styles.submitBtn}
                onClick={handleMrzParse}
                disabled={!mrzInput.trim()}
              >
                Parse & Fill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowBookingModal(false)}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Book {getServiceTitle()} Service
              </h2>
              <button
                style={styles.modalClose}
                onClick={() => setShowBookingModal(false)}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {selectedPkg && (
              <div style={styles.modalPackageInfo}>
                <h3 style={styles.modalPackageName}>
                  {selectedPkg.visaName ||
                    selectedPkg.hotelName ||
                    `${selectedPkg.transportType} - ${selectedPkg.sector}`}
                </h3>
                <p style={styles.modalPackageDetails}>
                  {selectedService === "visa" &&
                    `${selectedPkg.visaCountry} - ${selectedPkg.documentNumber}`}
                  {selectedService === "transport" &&
                    `${selectedPkg.transportType} - ${selectedPkg.sector}`}
                  {selectedService === "hotel" && selectedPkg.hotelName}
                </p>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={bookingData.name}
                    onChange={handleBookingChange}
                    style={styles.input}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={bookingData.email}
                    onChange={handleBookingChange}
                    style={styles.input}
                    // requireds
                    placeholder="your.email@example.com"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={bookingData.phone}
                    onChange={handleBookingChange}
                    style={styles.input}
                    // required
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Adults</label>
                  <input
                    type="number"
                    name="adults"
                    value={bookingData.adults}
                    onChange={handleBookingChange}
                    style={styles.input}
                    min="1"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Children</label>
                  <input
                    type="number"
                    name="children"
                    value={bookingData.children}
                    onChange={handleBookingChange}
                    style={styles.input}
                    min="0"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Infants</label>
                  <input
                    type="number"
                    name="infants"
                    value={bookingData.infants}
                    onChange={handleBookingChange}
                    style={styles.input}
                    min="0"
                  />
                </div>
              </div>

              {/* Visa-specific fields */}
              {selectedService === "visa" && selectedPkg && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Visa Duration *</label>
                    <select
                      name="duration"
                      value={bookingData.duration}
                      onChange={handleBookingChange}
                      style={styles.input}
                      required
                    >
                      <option value="">Select Duration</option>
                      {getDurations(selectedPkg).map((dur) => (
                        <option key={dur} value={dur}>
                          {DURATION_LABELS[dur] || `${dur} Days`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Transport *</label>
                    <select
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      style={styles.input}
                      required
                    >
                      <option value="withTransport">With Transport</option>
                      <option value="withoutTransport">Without Transport</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Hotel-specific fields */}
              {selectedService === "hotel" && selectedPkg && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Room Type *</label>
                    <select
                      name="roomType"
                      value={bookingData.roomType}
                      onChange={handleBookingChange}
                      style={styles.input}
                      required
                    >
                      <option value="">Select Room Type</option>
                      {selectedPkg.rates
                        ?.filter((r) => r.active)
                        .map((rate) => (
                          <option key={rate._id} value={rate._id}>
                            {rate.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Check-in Date *</label>
                      <input
                        type="date"
                        name="checkIn"
                        value={bookingData.checkIn}
                        onChange={handleBookingChange}
                        style={styles.input}
                        required
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Check-out Date *</label>
                      <input
                        type="date"
                        name="checkOut"
                        value={bookingData.checkOut}
                        onChange={handleBookingChange}
                        style={styles.input}
                        required
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>No. of Rooms *</label>
                      <input
                        type="number"
                        name="numberOfRooms"
                        value={bookingData.numberOfRooms}
                        onChange={handleBookingChange}
                        style={styles.input}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Transport-specific fields */}
              {selectedService === "transport" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>No. of Passengers</label>
                  <input
                    type="number"
                    name="numberOfPax"
                    value={bookingData.numberOfPax}
                    style={{ ...styles.input, background: "#f0f0f0", cursor: "not-allowed" }}
                    min="1"
                    disabled
                    readOnly
                  />
                </div>
              )}

              {/* Passenger Information */}
              {bookingData.passengers.length > 0 && (
                <div style={styles.passengersSection}>
                  <h3 style={styles.sectionTitle}>Passenger Information</h3>
                  {bookingData.passengers.map((passenger, index) => (
                    <div key={index} style={styles.passengerCard}>
                      <div
                        style={{
                          ...styles.passengerHeader,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={styles.passengerBadge}>
                          {passenger.type.charAt(0).toUpperCase() +
                            passenger.type.slice(1)}{" "}
                          {index + 1}
                        </span>
                        {selectedService !== "transport" && (
                          <button
                            type="button"
                            onClick={() => handleMrzScan(index)}
                            style={styles.mrzScanBtn}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ marginRight: 5 }}
                            >
                              <rect x="2" y="6" width="20" height="12" rx="2" />
                              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h8" />
                            </svg>
                            MRZ Scan
                          </button>
                        )}
                      </div>
                      <div
                        style={{
                          ...styles.passengerRow,
                          gridTemplateColumns:
                            selectedService === "hotel" || selectedService === "transport" ? "1fr" : "2fr 1fr 1fr",
                        }}
                      >
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Full Name *</label>
                          <input
                            type="text"
                            value={passenger.fullName}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "fullName",
                                e.target.value,
                              )
                            }
                            style={styles.input}
                            required
                            placeholder={selectedService === "transport" ? "Full name" : "As per passport"}
                          />
                        </div>
                        {selectedService !== "hotel" && selectedService !== "transport" && (
                          <>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>
                                Passport Number *
                              </label>
                              <input
                                type="text"
                                value={passenger.passportNumber}
                                onChange={(e) =>
                                  handlePassengerChange(
                                    index,
                                    "passportNumber",
                                    e.target.value,
                                  )
                                }
                                style={styles.input}
                                required
                                placeholder="Passport number"
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>
                                Passport Expiry *
                              </label>
                              <input
                                type="date"
                                value={passenger.passportExpiry}
                                onChange={(e) =>
                                  handlePassengerChange(
                                    index,
                                    "passportExpiry",
                                    e.target.value,
                                  )
                                }
                                style={styles.input}
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Additional Notes</label>
                <textarea
                  name="notes"
                  value={bookingData.notes}
                  onChange={handleBookingChange}
                  style={styles.textarea}
                  rows="4"
                  placeholder="Any special requirements or additional information..."
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowBookingModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Booking Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    minHeight: "100vh",
    background: theme.colors.backgroundDark,
    padding: "32px 24px",
    boxSizing: "border-box",
  },
  capsulesContainer: {
    display: "flex",
    gap: 12,
    marginBottom: 32,
    flexWrap: "wrap",
  },
  capsule: {
    background: "#fff",
    border: `2px solid ${theme.colors.border}`,
    borderRadius: 25,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    color: theme.colors.secondary,
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
    display: "flex",
    alignItems: "center",
  },
  capsuleActive: {
    background: theme.colors.ublGradient,
    border: `2px solid ${theme.colors.ublGradientEnd}`,
    color: "#fff",
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(33, 57, 124, 0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: theme.colors.secondary,
    margin: "0 0 4px",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    margin: 0,
  },
  badge: {
    background: theme.colors.sidebarBg,
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 20,
  },
  centerBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 80,
    gap: 12,
  },
  spinner: {
    width: 32,
    height: 32,
    border: `3px solid ${theme.colors.border}`,
    borderTop: `3px solid ${theme.colors.sidebarBg}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: theme.colors.secondary, fontSize: 14, margin: 0 },
  emptyText: { color: theme.colors.sidebarText, fontSize: 15, margin: 0 },
  errorBox: {
    background: theme.colors.dangerLight,
    border: `1px solid ${theme.colors.danger}`,
    borderRadius: 10,
    padding: 24,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  errorText: { color: theme.colors.danger, fontSize: 14, margin: 0, flex: 1 },
  retryBtn: {
    background: theme.colors.danger,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
    marginTop: 20,
  },
  gridCard: {
    background: "#fff",
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: 12,
    padding: 20,
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    ":hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
  },
  gridCardClickable: {
    flex: 1,
  },
  gridCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    background: theme.colors.ublGradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    color: "#fff",
  },
  gridCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  gridCardFlag: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.colors.secondary,
  },
  gridCardDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: theme.colors.sidebarBg,
    margin: "0 0 6px",
  },
  gridCardDoc: {
    fontSize: 12,
    color: theme.colors.sidebarText,
    margin: 0,
  },
  detailContainer: {
    marginTop: 20,
  },
  backBtn: {
    background: "#fff",
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: theme.colors.secondary,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    transition: "all 0.2s ease",
    outline: "none",
  },
  detailCard: {
    background: "#fff",
    borderRadius: 14,
    border: `1px solid ${theme.colors.border}`,
    padding: "24px 28px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    margin: "0 0 4px",
  },
  detailSub: {
    fontSize: 13,
    color: theme.colors.secondary,
    margin: 0,
  },
  metaRight: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  infoChip: {
    fontSize: 12,
    fontWeight: 500,
    color: theme.colors.secondaryDark,
    border: `1px solid ${theme.colors.borderDark}`,
    borderRadius: 20,
    padding: "4px 12px",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    margin: 0,
  },
  toggleWrap: {
    display: "flex",
    background: theme.colors.backgroundDark,
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 500,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    background: "transparent",
    color: theme.colors.secondary,
    transition: "all 0.15s",
  },
  toggleBtnActive: {
    background: theme.colors.sidebarBg,
    color: "#fff",
    fontWeight: 600,
  },
  // Compact Card-Based Pricing Styles
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  pricingCard: {
    background: "#fff",
    border: `2px solid ${theme.colors.border}`,
    borderRadius: 12,
    overflow: "hidden",
    transition: "all 0.25s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  pricingCardHeader: {
    background: theme.colors.ublGradient,
    padding: "12px 16px",
    textAlign: "center",
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  pricingCardBody: {
    padding: "12px",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 6,
    marginBottom: 6,
    background: theme.colors.backgroundDark,
    transition: "all 0.2s",
  },
  priceLabel: {
    display: "flex",
    alignItems: "center",
    color: theme.colors.secondaryDark,
  },
  passengerLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  priceAmount: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    fontVariantNumeric: "tabular-nums",
  },
  // Transport Info Cards Styles
  transportInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  transportInfoCard: {
    background: "#fff",
    border: `2px solid ${theme.colors.border}`,
    borderRadius: 12,
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    transition: "all 0.25s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  transportIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    background: theme.colors.ublGradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  transportInfoContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  transportInfoLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  transportInfoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: theme.colors.sidebarBg,
  },
  transportPriceValue: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    fontVariantNumeric: "tabular-nums",
  },
  // Hotel Room Cards Styles
  hotelRoomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  hotelRoomCard: {
    background: "#fff",
    border: `2px solid ${theme.colors.border}`,
    borderRadius: 12,
    overflow: "hidden",
    transition: "all 0.25s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  hotelRoomHeader: {
    background: theme.colors.ublGradient,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  hotelRoomIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
  },
  hotelRoomName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    textTransform: "capitalize",
  },
  hotelRoomBody: {
    padding: "16px",
  },
  hotelRoomPriceSection: {
    background: theme.colors.backgroundDark,
    padding: "12px 14px",
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  hotelRateSection: {
    background: theme.colors.backgroundDark,
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 4,
  },
  hotelRateSectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    display: "block",
    marginBottom: 6,
  },
  hotelRatePair: {
    display: "flex",
    gap: 12,
  },
  hotelRateItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  hotelPriceLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  hotelPriceValue: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    fontVariantNumeric: "tabular-nums",
  },
  hotelRoomDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  hotelDetailItem: {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    color: theme.colors.secondaryDark,
  },
  hotelDetailLabel: {
    fontWeight: 600,
    marginRight: 6,
  },
  hotelDetailValue: {
    fontWeight: 500,
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 10,
    border: `1px solid ${theme.colors.border}`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    padding: "8px 12px",
    background: theme.colors.secondaryLight,
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.colors.secondaryDark,
    borderBottom: `1px solid ${theme.colors.border}`,
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: `1px solid ${theme.colors.backgroundDark}`,
    transition: "background 0.1s",
  },
  td: {
    padding: "8px 12px",
    color: theme.colors.secondaryDark,
    textAlign: "center",
    verticalAlign: "middle",
  },
  tdNum: {
    padding: "8px 12px",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    color: theme.colors.sidebarBg,
    verticalAlign: "middle",
  },
  tdDuration: {
    padding: "8px 12px",
    textAlign: "left",
    fontWeight: 600,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    borderRight: `1px solid ${theme.colors.border}`,
  },
  durationBadge: {
    background: theme.colors.sidebarBg,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 5,
    letterSpacing: "0.04em",
  },
  passengerTag: {
    background: theme.colors.backgroundDark,
    color: theme.colors.secondaryDark,
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 20,
    textTransform: "capitalize",
  },
  bookBtn: {
    background: theme.colors.ublGradient,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    transition: "all 0.2s ease",
    width: "100%",
    outline: "none",
    boxShadow: "0 2px 4px rgba(33, 57, 124, 0.2)",
  },
  bookBtnDetail: {
    background: theme.colors.ublGradient,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
    outline: "none",
    boxShadow: "0 2px 4px rgba(33, 57, 124, 0.2)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    background: "#fff",
    borderRadius: 16,
    maxWidth: 1000,
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: `2px solid ${theme.colors.border}`,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    margin: 0,
  },
  modalClose: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    color: theme.colors.secondary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    transition: "all 0.2s",
    outline: "none",
  },
  modalPackageInfo: {
    padding: "16px 24px",
    background: theme.colors.secondaryLight,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  modalPackageName: {
    fontSize: 16,
    fontWeight: 600,
    color: theme.colors.sidebarBg,
    margin: "0 0 4px",
  },
  modalPackageDetails: {
    fontSize: 13,
    color: theme.colors.secondary,
    margin: 0,
  },
  form: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.secondaryDark,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: 8,
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: 8,
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 24,
    paddingTop: 16,
    borderTop: `1px solid ${theme.colors.border}`,
  },
  cancelBtn: {
    background: "#fff",
    color: theme.colors.secondary,
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
  },
  submitBtn: {
    background: theme.colors.ublGradient,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
    boxShadow: "0 2px 8px rgba(33, 57, 124, 0.3)",
  },
  passengersSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.colors.sidebarBg,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: `2px solid ${theme.colors.border}`,
  },
  passengerCard: {
    background: theme.colors.backgroundDark,
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  passengerRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 16,
  },
  passengerHeader: {
    marginBottom: 12,
  },
  passengerBadge: {
    display: "inline-block",
    background: theme.colors.ublGradient,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 20,
    textTransform: "capitalize",
  },
  mrzScanBtn: {
    background: "#3B82F6",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    outline: "none",
    transition: "all 0.2s ease",
  },
};

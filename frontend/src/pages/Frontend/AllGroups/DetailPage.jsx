import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { theme } from "../../../theme/theme";
import UmrahBookingForm from "../../../components/UmrahBookingForm";
import {
  FaPlaneDeparture,
  FaPlaneArrival,
  FaHotel,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";
import { Ticket, ClipboardCheck, Info } from "lucide-react";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

const RoomType = {
  SHARING: "sharing",
  QUINT: "quint",
  QUAD: "quad",
  TRIPLE: "triple",
  DOUBLE: "double",
};

export default function DetailPage({ user }) {
  const { state } = useLocation();
  const group = state?.group;
  // console.log(group);

  const [selectedRoom, setSelectedRoom] = useState(RoomType.SHARING);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!group) {
    return (
      <div
        style={{
          padding: "100px",
          textAlign: "center",
          color: theme.colors.textSecondary,
        }}
      >
        <Info size={48} style={{ marginBottom: "10px", opacity: 0.5 }} />
        <h2>No package data found.</h2>
      </div>
    );
  }

  const roomPrices = {
    sharing: group.rooms?.sharing || 0,
    quint: group.rooms?.quint || 0,
    quad: group.rooms?.quad || 0,
    triple: group.rooms?.triple || 0,
    double: group.rooms?.double || 0,
  };

  const currentPrice = roomPrices[selectedRoom];

  // Group hotels by city
  const hotelsByCity = {};
  (group.hotels || []).forEach((hotel) => {
    const city = hotel.city || "Other";
    if (!hotelsByCity[city]) {
      hotelsByCity[city] = [];
    }
    hotelsByCity[city].push(hotel);
  });

  const departureFlight = group.details?.[0];

  return (
    <div
      style={{
        backgroundColor: "#f4f7fe",
        minHeight: "100vh",
        padding: isMobile ? "15px 12px" : "30px 20px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .hotel-grid { grid-template-columns: 1fr !important; }
          .room-grid { grid-template-columns: 1fr 1fr !important; }
          .header-inner { flex-direction: column !important; align-items: flex-start !important; }
          .header-ref { text-align: left !important; }
          .sticky-col { position: static !important; }
        }
        @media (max-width: 480px) {
          .header-title { font-size: 1.5rem !important; }
        }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* --- HEADER --- */}
        <div
          style={{
            background: theme.colors.ublGradient,
            borderRadius: "20px",
            padding: isMobile ? "20px" : "35px",
            color: "white",
            marginBottom: "30px",
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="header-inner"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <Ticket size={20} />
                <span
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {group.voucher_id}
                </span>
              </div>
              <h1
                className="header-title"
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "2.2rem",
                  fontWeight: 800,
                }}
              >
                {group.packageName}
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  alignItems: "center",
                  opacity: 0.9,
                  fontSize: "0.95rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaPlaneDeparture /> {group.airlineName}
                </span>
                <span>•</span>
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaMapMarkerAlt /> {group.sector}
                </span>
              </div>
            </div>
            <div
              className="header-ref"
              style={{
                textAlign: "right",
                background: "rgba(255,255,255,0.15)",
                padding: "15px 25px",
                borderRadius: "15px",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
                Ref Number
              </p>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{group.refNumber}</h3>
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div
          className="detail-grid"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr",
            gap: "30px",
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "25px" }}
          >
            <div
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                height: isMobile ? "220px" : "400px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <img
                src={group.img}
                alt="Umrah"
                onError={(e) => {
                  e.target.src =
                    "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg";
                }}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* HOTELS SECTION - ALL CITIES */}
            <div
              className="hotel-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              {Object.entries(hotelsByCity).map(([city, hotels]) =>
                hotels.map((hotel, index) => (
                  <HotelCard
                    key={hotel._id || `${city}-${index}`}
                    hotel={hotel}
                    city={city}
                  />
                )),
              )}
            </div>

            <IncludesCard />

            {/* Transport Details */}
            {group.transports && group.transports.length > 0 && (
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Transport Details</h3>
                {group.transports.map((transport, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      marginBottom:
                        index < group.transports.length - 1 ? "10px" : "0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#2d3748" }}>
                        {transport.transportType}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#718096",
                          background: "#edf2f7",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {transport.vehicleCount} vehicles
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#718096",
                        marginBottom: "4px",
                      }}
                    >
                      <strong>Sector:</strong> {transport.sector}
                    </div>
                    {/* <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#718096",
                        marginBottom: "4px",
                      }}
                    >
                      <strong>Supplier:</strong> {transport.supplierName}
                    </div> */}
                    {transport.notes && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#a0aec0",
                          fontStyle: "italic",
                          marginTop: "6px",
                        }}
                      >
                        {transport.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div
            className="sticky-col"
            style={{
              position: isMobile ? "static" : "sticky",
              top: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "25px",
            }}
          >
            {/* Flight Schedule */}
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Flight Schedule</h3>
              {group.flights && group.flights.length > 0 ? (
                <>
                  {group.flights.map((flight, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && (
                        <div
                          style={{
                            height: "1px",
                            background: "#edf2f7",
                            margin: "15px 0",
                          }}
                        />
                      )}
                      <FlightInfo
                        label={
                          index === 0 ? "Departure" : `Flight ${index + 1}`
                        }
                        data={{
                          flight_no: flight.flightNumber,
                          dep_date: flight.departureDate,
                          origin: flight.sector?.split("-")[0] || "",
                          destination: flight.sector?.split("-")[1] || "",
                        }}
                        arrivalDate={flight.arrivalDate}
                        availableSeats={flight.availableSeats}
                        icon={<FaPlaneDeparture color={theme.colors.primary} />}
                      />
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <>
                  <FlightInfo
                    label="Departure"
                    data={departureFlight}
                    icon={<FaPlaneDeparture color={theme.colors.primary} />}
                  />
                  <div
                    style={{
                      height: "1px",
                      background: "#edf2f7",
                      margin: "15px 0",
                    }}
                  />
                  <FlightInfo
                    label="Return"
                    flightNo={group.returnFlight}
                    date={group.returnDate}
                    origin="JED"
                    destination="LHE"
                    icon={<FaPlaneArrival color={theme.colors.primary} />}
                  />
                </>
              )}
            </div>

            {/* Price Selection */}
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Select Room & Book</h3>
              <div
                className="room-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                {Object.keys(roomPrices).map((room) => (
                  <button
                    key={room}
                    onClick={() => setSelectedRoom(room)}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: `2px solid ${selectedRoom === room ? theme.colors.ublGradientStart : "#edf2f7"}`,
                      background: selectedRoom === room ? "#f0f7ff" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "0.2s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        color: "#718096",
                        fontWeight: 700,
                      }}
                    >
                      {room}
                    </div>
                    <div style={{ fontWeight: 700, color: "#2d3748" }}>
                      Rs.{roomPrices[room].toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>

              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#718096" }}>
                  Selected Price
                </span>
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    color: theme.colors.success,
                  }}
                >
                  PKR {currentPrice.toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={() => setShowBookingModal(true)}
                  style={priBtn}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UmrahBookingForm
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        packageData={group}
        selectedRoom={selectedRoom}
        pricePerPerson={currentPrice}
        user={user?._id}
      />
    </div>
  );
}

/* ==================== HOTEL CARD ==================== */
function HotelCard({ hotel, city }) {
  if (!hotel) return null;

  // Determine city image
  const getCityImage = () => {
    switch (city) {
      case "Makkah":
        return "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png";
      case "Madinah":
        return "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png";
      default:
        return "https://static.vecteezy.com/system/resources/previews/024/160/410/non_2x/blank-board-with-shop-store-building-icon-in-peach-and-white-color-vector.jpg";
    }
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.35rem" }}>
            <img
              style={{ height: 60, marginRight: 8 }}
              src={getCityImage()}
              alt={city}
            />
            {city}
          </h3>
        </div>
      </div>

      <div
        style={{
          fontWeight: 700,
          fontSize: "0.95rem",
          marginBottom: "8px",
          color: "#2d3748",
        }}
      >
        {hotel.name}
      </div>

      <div
        style={{
          display: "flex",
          gap: "15px",
          fontSize: "0.8rem",
          color: "#718096",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FaMapMarkerAlt /> {hotel.location?.distance}m
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FaStar color="#ecc94b" /> {hotel.rating}.0
        </span>
      </div>
    </div>
  );
}

/* ==================== OTHER COMPONENTS ==================== */
function FlightInfo({
  label,
  data,
  flightNo,
  date,
  origin,
  destination,
  icon,
  arrivalDate,
  availableSeats,
}) {
  const fNo = data?.flight_no || flightNo;
  const fDate = data?.dep_date || date;
  const fArrivalDate = arrivalDate;

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div style={{ marginTop: "4px" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#a0aec0",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          <span style={{ fontWeight: 700, color: "#2d3748" }}>
            {formatDate(fDate)}
          </span>
          <span
            style={{
              fontSize: "0.8rem",
              background: "#edf2f7",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {fNo}
          </span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#718096" }}>
          {formatTime(fDate)} • {data?.origin || origin} to{" "}
          {data?.destination || destination}
        </div>
        {fArrivalDate && (
          <div
            style={{ fontSize: "0.8rem", color: "#a0aec0", marginTop: "4px" }}
          >
            Arrival: {formatDate(fArrivalDate)} {formatTime(fArrivalDate)}
          </div>
        )}
        {availableSeats !== undefined && (
          <div
            style={{
              fontSize: "0.8rem",
              color: theme.colors.success,
              marginTop: "4px",
              fontWeight: 600,
            }}
          >
            {availableSeats} seats available
          </div>
        )}
      </div>
    </div>
  );
}

function IncludesCard() {
  const list = ["Visa", "Tickets", "Hotel", "Transport"];
  return (
    <div style={cardStyle}>
      <h3
        style={{
          ...cardTitleStyle,
          display: "flex",
          alignItems: "space-betweeen",
          gap: "13px",
        }}
      >
        <ClipboardCheck size={18} /> Package Includes
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {list.map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              color: "#4a5568",
              background: "#f7fafc",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #edf2f7",
            }}
          >
            <FaCheckCircle color={theme.colors.success} size={12} /> {item}
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  border: "1px solid #e2e8f0",
};

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: "15px",
  fontSize: "1rem",
  color: "#1a202c",
  fontWeight: 700,
};

const priBtn = {
  flex: 1,
  background: theme.colors.ublGradient,
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: 600,
  cursor: "pointer",
};

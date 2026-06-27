import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from "../../../theme/theme";
import {
  FaCar,
  FaBus,
  FaPlaneDeparture,
  FaPlaneArrival,
  FaHotel,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaStar,
  FaMapMarkedAlt,
} from "react-icons/fa";
import { Ticket, ClipboardCheck, Info } from "lucide-react";

// Standard Global Styles (Ensuring theme is safe)
const getCardStyle = () => ({
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  border: "1px solid #e2e8f0",
});

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: "15px",
  fontSize: "1rem",
  color: "#1a202c",
  fontWeight: 700,
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time) => {
  if (!time) return "N/A";
  return time;
};

export default function DetailPage({ user }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const group = state?.group;
  const selectedRoomType = state?.selectedRoomType;

  // FIX: Default value preference logic set ki hai jo console error handle karegi
  const ROOM_CAPACITY = { sharing: 1, double: 2, triple: 3, quad: 4, quint: 5, hexa: 6 };

  const isRoomAvailable = (roomKey, roomsMap, avail) => {
    if (!roomsMap[roomKey] && roomsMap[roomKey] !== 0) return false; // no price defined
    if (avail == null) return true; // seats not tracked
    return avail >= (ROOM_CAPACITY[roomKey] || 1);
  };

  const [selectedRoom, setSelectedRoom] = useState(() => {
    const rooms = state?.group?.rooms || {};
    const avail = state?.group?.availableRooms;
    const roomCap = { sharing: 1, double: 2, triple: 3, quad: 4, quint: 5, hexa: 6 };
    const isValid = (k) => {
      if (!rooms[k] && rooms[k] !== 0) return false;
      if (rooms[k] === 0 || rooms[k] === null) return false;
      if (avail == null) return true;
      return avail >= (roomCap[k] || 1);
    };
    if (selectedRoomType && isValid(selectedRoomType)) return selectedRoomType;
    return Object.keys(rooms).find(isValid) || "sharing";
  });

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
          color: theme?.colors?.textSecondary || "#718096",
        }}
      >
        <Info size={48} style={{ marginBottom: "10px", opacity: 0.5 }} />
        <h2>No package data found.</h2>
      </div>
    );
  }

  const roomPrices = group.rooms || {};
  const currentPrice = roomPrices[selectedRoom] || 0;
  const availableRooms = group.availableRooms;

  // Group hotels by city
  const hotelsByCity = {};
  (group.hotels || []).forEach((hotel) => {
    const city = hotel.city || "Other";
    if (!hotelsByCity[city]) {
      hotelsByCity[city] = [];
    }
    hotelsByCity[city].push(hotel);
  });

  const priBtn = {
    flex: 1,
    background:
      theme?.colors?.ublGradient || "linear-gradient(90deg, #0056b3, #007bff)",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
  };
console.log(group);

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
        {/* HEADER */}
        <div
          style={{
            background:
              theme?.colors?.ublGradient ||
              "linear-gradient(90deg, #0056b3, #007bff)",
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
                  {group.airlineName}
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
                  <FaPlaneDeparture /> {group.flights?.[0]?.flightNo || "N/A"}
                </span>
                <span>•</span>
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaMapMarkerAlt /> {group.flights?.[0]?.sectorFrom} -{" "}
                  {group.flights?.[0]?.sectorTo}
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
                Available Packages
              </p>
              <h3 style={{ margin: 0, fontWeight: 700 }}>
                {group.availableRooms}
              </h3>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
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
                src={
                  group.logo ||
                  "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg"
                }
                alt="Umrah"
                onError={(e) => {
                  e.target.src =
                    "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg";
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* HOTELS */}
            <div
              className="hotel-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              {Object.entries(hotelsByCity).map(([city, hotels]) => {
                const uniqueHotels = hotels.reduce((acc, hotel) => {
                  const hotelName = hotel.name?.trim().toLowerCase();
                  if (
                    hotelName &&
                    !acc.some((h) => h.name?.trim().toLowerCase() === hotelName)
                  ) {
                    acc.push(hotel);
                  }
                  return acc;
                }, []);

                return uniqueHotels.map((hotel, index) => (
                  <HotelCard
                    key={hotel._id || `${city}-${hotel.name || index}`}
                    hotel={hotel}
                    city={city}
                  />
                ));
              })}
            </div>

            <IncludesCard />

            {/* <div style={{ marginTop: "10px" }}>
              <div style={getCardStyle()}>
                <h3
                  style={{
                    ...cardTitleStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <FaBus size={18} /> Transport Details
                </h3>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {group.transport &&
                    group.transport.map((item, index) => (
                      <TransportPill key={index} transport={item} />
                    ))}
                </div>
              </div>
            </div> */}
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
            <div style={getCardStyle()}>
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
                        data={flight}
                        icon={
                          <FaPlaneDeparture
                            color={theme?.colors?.primary || "#0056b3"}
                          />
                        }
                      />
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <div>No Flights Available</div>
              )}
            </div>

            {/* Price Selection */}
            <div style={getCardStyle()}>
              <h3 style={cardTitleStyle}>Select Room & Book</h3>

              {(() => {
                const roomOrder = [
                  "sharing",
                  "hexa",
                  "quint",
                  "quad",
                  "triple",
                  "double",
                ];
                const filteredRooms = roomOrder.filter(
                  (room) => {
                    const price = roomPrices[room];
                    return (
                      price !== null &&
                      price !== undefined &&
                      price > 0
                    );
                  }
                );

                return (
                  <div
                    className="room-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    {filteredRooms.map((room, index) => {
                      const isLastOddItem =
                        filteredRooms.length % 2 !== 0 &&
                        index === filteredRooms.length - 1;

                      const isSelected = selectedRoom === room;
                      const canBook = isRoomAvailable(room, roomPrices, availableRooms);

                      return (
                        <button
                          key={room}
                          type="button"
                          disabled={!canBook}
                          onClick={() => {
                            if (canBook) setSelectedRoom(room);
                          }}
                          title={!canBook ? `Requires ${ROOM_CAPACITY[room]} seats — only ${availableRooms} available` : undefined}
                          style={{
                            padding: "12px",
                            borderRadius: "12px",
                            border: `2px solid ${
                              !canBook
                                ? "#e2e8f0"
                                : isSelected
                                ? theme?.colors?.primary || "#0056b3"
                                : "#edf2f7"
                            }`,
                            background: !canBook ? "#f9fafb" : isSelected ? "#f0f7ff" : "white",
                            cursor: !canBook ? "not-allowed" : "pointer",
                            textAlign: "left",
                            transition: "0.2s",
                            opacity: !canBook ? 0.45 : 1,
                            gridColumn: isLastOddItem ? "1 / -1" : "auto",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.75rem",
                              textTransform: "uppercase",
                              color: !canBook
                                ? "#a0aec0"
                                : isSelected
                                ? theme?.colors?.primary || "#0056b3"
                                : "#718096",
                              fontWeight: 700,
                            }}
                          >
                            {room}{!canBook && " (Unavailable)"}
                          </div>
                          <div style={{ fontWeight: 700, color: !canBook ? "#a0aec0" : "#2d3748" }}>
                            Rs.{roomPrices[room]?.toLocaleString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

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
                  Selected Price ({selectedRoom.toUpperCase()})
                </span>
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    color: theme?.colors?.success || "#2f855a",
                  }}
                >
                  PKR {currentPrice.toLocaleString()}
                </div>
              </div>

              {/* BOOK BUTTON */}
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  disabled={!isRoomAvailable(selectedRoom, roomPrices, availableRooms)}
                  onClick={() => {
                    if (!isRoomAvailable(selectedRoom, roomPrices, availableRooms)) return;
                    navigate("/dashboard/book-umrah", {
                      state: {
                        packageData: group,
                        selectedRoom: selectedRoom,
                        pricePerPerson: currentPrice,
                      },
                    });
                  }}
                  style={{
                    ...priBtn,
                    opacity: isRoomAvailable(selectedRoom, roomPrices, availableRooms) ? 1 : 0.5,
                    cursor: isRoomAvailable(selectedRoom, roomPrices, availableRooms) ? "pointer" : "not-allowed",
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== HOTEL CARD ==================== */
function HotelCard({ hotel, city }) {
  if (!hotel) return null;

  const getCityImage = () => {
    const cityLower = city?.toLowerCase() || "";
    if (cityLower.includes("makkah") || cityLower.includes("mecca")) {
      return "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png";
    }
    if (
      cityLower.includes("madinah") ||
      cityLower.includes("madina") ||
      cityLower.includes("medina")
    ) {
      return "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png";
    }
    return "https://static.vecteezy.com/system/resources/previews/024/160/410/non_2x/blank-board-with-shop-store-building-icon-in-peach-and-white-color-vector.jpg";
  };

  const hotelCardStyle = {
    position: "relative",
    width: "100%",
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02)",
    transition: "all 0.3s ease",
    border: "1px solid #e2e8f0",
  };

  return (
    <div style={hotelCardStyle}>
      {hotel.mapUrl && (
        <a
          href={hotel.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "white",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 10,
            color: "#1e88e5",
            textDecoration: "none",
          }}
        >
          <FaMapMarkedAlt size={18} />
        </a>
      )}

      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <img
            style={{
              height: 44,
              width: 44,
              objectFit: "contain",
              borderRadius: "10px",
              background: "#f8fafc",
            }}
            src={getCityImage()}
            alt={city}
          />
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: "#1e2937",
            }}
          >
            {city}
          </h3>
        </div>

        <div
          style={{
            fontWeight: 700,
            fontSize: "1rem",
            lineHeight: "1.3",
            color: "#0f172a",
            marginBottom: "10px",
          }}
        >
          {hotel?.name}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: "#fee2e2",
                color: "#ef4444",
                fontWeight: "600",
                fontSize: "0.8rem",
              }}
            >
              <FaMapMarkerAlt size={12} />
              {hotel?.distance}m
            </span>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "#64748b",
              }}
            >
              <FaStar color="#facc15" size={14} />
              <span style={{ fontWeight: 600, color: "#1e2937" }}>
                {hotel.rating}.0
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== FLIGHT INFO ==================== */
function FlightInfo({ label, data, icon }) {
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
            {formatDate(data?.depDate)}
          </span>
          <span
            style={{
              fontSize: "0.8rem",
              background: "#edf2f7",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {data?.flightNo}
          </span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#718096" }}>
          {formatTime(data?.depTime)} • {data?.sectorFrom} to {data?.sectorTo}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#a0aec0", marginTop: "4px" }}>
          Arrival: {formatDate(data?.arrDate)} {formatTime(data?.arrTime)}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#718096", marginTop: "5px" }}>
          {data?.flightClass} • {data?.baggage}KG • Meal: {data?.meal}
        </div>
      </div>
    </div>
  );
}

/* ==================== INCLUDES CARD ==================== */
function IncludesCard() {
  const list = ["Visa", "Tickets", "Hotel", "Transport"];
  return (
    <div style={getCardStyle()}>
      <h3
        style={{
          ...cardTitleStyle,
          display: "flex",
          alignItems: "center",
          gap: "10px",
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
            <FaCheckCircle
              color={theme?.colors?.success || "#2f855a"}
              size={12}
            />{" "}
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== TRANSPORT PILL ==================== */
function TransportPill({ transport }) {
  if (!transport) return null;

  const getTransportIcon = (type) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("car")) return <FaCar size={18} />;
    return <FaBus size={18} />;
  };

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: "195px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          background: "white",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1e2937",
          border: "1px solid #edf2f7",
        }}
      >
        {getTransportIcon(transport.transportType)}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e2937" }}>
          {transport.route}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
          {transport.transportType} • Private
        </div>
      </div>
    </div>
  );
}

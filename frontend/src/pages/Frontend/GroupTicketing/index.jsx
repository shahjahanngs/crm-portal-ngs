import React, { useEffect, useState } from "react";
import {
  FaPlane,
  FaSuitcase,
  FaUtensils,
  FaPhone,
  FaEnvelope,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { HiTicket } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import TopBar from "../../../components/TopBar/TopBar";

export default function GroupTicketingPage({ user }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("All");

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/zip-accounts/group-ticketing");
      const data = res.data;
      if (data.success) {
        setGroups(data.data);
      } else {
        setError("Failed to load group ticketing data.");
      }
    } catch (err) {
      console.error("Error fetching group ticketing:", err);
      setError("Unable to fetch group ticketing packages.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // flight.departureTime / arrivalTime come as "HH:MM" strings
  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const airlines = [
    "All",
    ...new Set(groups.map((g) => g.airline).filter(Boolean)),
  ];

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      g.groupName?.toLowerCase().includes(q) ||
      g.sector?.toLowerCase().includes(q) ||
      g.airline?.toLowerCase().includes(q) ||
      g.documentNumber?.toLowerCase().includes(q) ||
      g.pnr?.toLowerCase().includes(q);
    const matchAirline = airlineFilter === "All" || g.airline === airlineFilter;
    return matchSearch && matchAirline;
  });

  return (
    <>
      <TopBar title={"Group Ticketing"} />
      <div className="px-4 sm:px-6 md:px-10 lg:px-20 mt-6 md:mt-10">
        <div className="max-w-8xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                Available Group Tickets
              </h1>
              {!loading && !error && (
                <span className="text-sm md:text-base bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search group, sector, airline, PNR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition w-full sm:w-60"
              />
              <select
                value={airlineFilter}
                onChange={(e) => setAirlineFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition w-full sm:w-auto"
              >
                {airlines.map((a) => (
                  <option key={a} value={a}>
                    {a === "All" ? "All Airlines" : a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-9 w-9 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
              <p className="text-slate-400 text-xs animate-pulse">
                Loading deals...
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-14 bg-white rounded-xl border border-red-100">
              <p className="text-red-500 text-sm font-medium">{error}</p>
              <button
                onClick={fetchGroups}
                className="mt-3 text-xs text-blue-600 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-14">
              <HiTicket className="text-5xl text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                No packages match your search
              </p>
            </div>
          )}

          {/* Cards */}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex flex-col gap-3 md:gap-4">
              {filtered.map((group) => (
                <GroupCard
                  key={group._id}
                  group={group}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  user={user}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function GroupCard({ group, formatDate, formatTime, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const { pricing, flights = [], showSeats, seats, noOfDays } = group;

  const visibleFlights = expanded ? flights : flights.slice(0, 2);

  const handleSelectGroup = () => {
    // Transform Group Ticketing data structure to match BookingForm expectations
    const transformedData = {
      id: group._id || group.groupId,
      source: "zip-api", // Identify this as coming from Group Ticketing
      type: group.groupCategory || group.type || "Group Ticketing",
      airline: {
        id: group.airlineId || null,
        airline_name: group.airline || "",
        logo_url: group.airlineLogo || "",
      },
      sector: group.sector || "",
      pnr: group.pnr || "",
      // Map pricing fields
      price: group.pricing?.sellingAdultB2B || 0,
      childPrice: group.pricing?.sellingChildB2B || 0,
      infantPrice: group.pricing?.sellingInfantB2B || 0,
      currency: group.pricing?.sellingCurrencyB2B || "PKR",
      // Map dates from first flight if available
      dept_date: group.flights?.[0]?.departureDate || "",
      arv_date: group.flights?.[group.flights.length - 1]?.arrivalDate || "",
      // Transform flights array to match BookingForm structure
      details:
        group.flights?.map((flight) => ({
          flight_no: flight.flightNo || "",
          flight_date: flight.departureDate || "",
          dep_date: flight.departureDate || "",
          dept_time: flight.departureTime || "",
          origin: flight.sectorFrom || "",
          destination: flight.sectorTo || "",
          arv_date: flight.arrivalDate || "",
          arv_time: flight.arrivalTime || "",
          baggage: flight.baggage || "",
          meal: flight.meal || "",
          flightClass: flight.flightClass || "",
          fromTerminal: flight.fromTerminal || "",
          toTerminal: flight.toTerminal || "",
        })) || [],
      // Available seats
      available_no_of_pax: group.seats || 0,
      showSeats: group.showSeats || false,
      noOfDays: group.noOfDays || 0,
      // Keep original data for reference
      originalData: group,
    };

    console.log("🎫 Original Group Data:", group);
    console.log("✨ Transformed Data:", transformedData);

    navigate("/dashboard/booking", {
      state: { groupData: transformedData },
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden">
      {/* ── Card Header ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-linear-to-r from-slate-50 to-slate-100 gap-3">
        {/* Left: airline info */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <FaPlane className="text-blue-600 text-lg md:text-xl" />
          </div>
          <span className="text-sm md:text-base font-bold text-slate-800">
            {group.airline}
          </span>
          {group.airlineCode && (
            <span className="text-[10px] md:text-xs font-mono text-slate-600">
              ({group.airlineCode})
            </span>
          )}
          <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-600 rounded-full uppercase tracking-wide">
            {group.groupCategory || group.type || "Group"}
          </span>
          {group.groupName && (
            <span className="text-xs md:text-sm font-medium text-slate-700">
              {group.groupName}
            </span>
          )}
          {/* {group.documentNumber && (
                        <span className="text-[10px] font-mono text-slate-700">
                            #{group.documentNumber}
                        </span>
                    )} */}
          {/* {group.pnr && (
                        <span className="text-[10px] text-slate-700">
                            PNR: {group.pnr}
                        </span>
                    )} */}
        </div>

        {/* Right: route + pricing + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs md:text-sm font-semibold text-slate-700 tracking-wider">
              {group.sector}
            </span>

            {noOfDays && (
              <span className="text-[10px] md:text-xs text-slate-700 bg-white px-2 py-1 rounded-full shadow-sm">
                {noOfDays} days
              </span>
            )}

            {/* Seats badge */}
            {showSeats && seats != null && (
              <span className="text-[10px] md:text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full whitespace-nowrap shadow-sm">
                {seats} seats left
              </span>
            )}

            {/* Contact icons */}
            {group.contactPhone && (
              <a
                href={`tel:${group.contactPhone}`}
                className="p-2 bg-white rounded-full text-slate-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                title={group.contactPhone}
              >
                <FaPhone size={11} />
              </a>
            )}
            {group.contactEmail && (
              <a
                href={`mailto:${group.contactEmail}`}
                className="p-2 bg-white rounded-full text-slate-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                title={group.contactEmail}
              >
                <FaEnvelope size={11} />
              </a>
            )}
          </div>

          {/* Pricing Section */}
          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            {pricing && (
              <div className="flex items-center gap-2">
                {pricing.sellingAdultB2B != null && (
                  <PricePill
                    label="Adult"
                    value={pricing.sellingAdultB2B}
                    currency={pricing.sellingCurrencyB2B}
                  />
                )}
                {pricing.sellingChildB2B != null && (
                  <PricePill
                    label="Child"
                    value={pricing.sellingChildB2B}
                    currency={pricing.sellingCurrencyB2B}
                  />
                )}
                {pricing.sellingInfantB2B != null && (
                  <PricePill
                    label="Infant"
                    value={pricing.sellingInfantB2B}
                    currency={pricing.sellingCurrencyB2B}
                  />
                )}
              </div>
            )}

            <button
              onClick={handleSelectGroup}
              className="text-xs md:text-sm font-bold px-4 md:px-6 py-2 md:py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg whitespace-nowrap transform hover:scale-105 active:scale-95"
            >
              Select & Book
            </button>
          </div>
        </div>
      </div>

      {/* ── Flight Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide whitespace-nowrap">
                Date
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide">
                Flight
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide">
                Sector
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide whitespace-nowrap">
                Dep. Time
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide whitespace-nowrap">
                Arr. Time
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide hidden sm:table-cell">
                Class
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide hidden md:table-cell">
                Baggage
              </th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-semibold tracking-wide hidden md:table-cell">
                Meal
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleFlights.map((flight, i) => (
              <FlightRow
                key={i}
                flight={flight}
                showSeats={showSeats}
                seats={seats}
                formatDate={formatDate}
                formatTime={formatTime}
                isLast={i === visibleFlights.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand toggle for 3+ flights */}
      {flights.length > 2 && (
        <div className="px-4 py-2 md:py-2.5 border-t border-slate-100 flex justify-center sm:justify-end">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline hover:text-blue-700 transition-colors"
          >
            {expanded ? (
              <>
                <FaChevronUp size={10} /> Show Less
              </>
            ) : (
              <>
                <FaChevronDown size={10} /> +{flights.length - 2} More Flights
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function FlightRow({
  flight,
  showSeats,
  seats,
  formatDate,
  formatTime,
  isLast,
}) {
  const nextDay =
    flight.arrivalDate &&
    flight.departureDate &&
    flight.arrivalDate !== flight.departureDate;

  return (
    <tr
      className={`hover:bg-slate-50 transition-colors ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      {/* Date */}
      <td className="px-2 md:px-3 py-2 md:py-3 text-slate-700 whitespace-nowrap text-[11px] md:text-xs">
        {formatDate(flight.departureDate)}
      </td>

      {/* Flight No */}
      <td className="px-2 md:px-3 py-2 md:py-3 font-semibold text-slate-800">
        {flight.flightNo || "—"}
      </td>

      {/* Sector */}
      <td className="px-2 md:px-3 py-2 md:py-3">
        <span className="flex items-center gap-1 font-medium text-slate-700 whitespace-nowrap">
          <span>{flight.sectorFrom}</span>
          {flight.fromTerminal && (
            <span className="text-[9px] text-slate-400 hidden sm:inline">
              ({flight.fromTerminal})
            </span>
          )}
          <span className="text-slate-300 text-[10px]">→</span>
          <span>{flight.sectorTo}</span>
          {flight.toTerminal && (
            <span className="text-[9px] text-slate-400 hidden sm:inline">
              ({flight.toTerminal})
            </span>
          )}
        </span>
      </td>

      {/* Departure time */}
      <td className="px-2 md:px-3 py-2 md:py-3 text-slate-500 whitespace-nowrap font-medium">
        {formatTime(flight.departureTime)}
      </td>

      {/* Arrival time */}
      <td className="px-2 md:px-3 py-2 md:py-3 text-slate-500 whitespace-nowrap font-medium">
        {formatTime(flight.arrivalTime)}
        {nextDay && (
          <span className="ml-1 text-[9px] font-bold text-amber-600">+1</span>
        )}
      </td>

      {/* Class */}
      <td className="px-2 md:px-3 py-2 md:py-3 text-slate-500 hidden sm:table-cell">
        {flight.flightClass || "—"}
      </td>

      {/* Baggage */}
      <td className="px-2 md:px-3 py-2 md:py-3 hidden md:table-cell">
        {flight.baggage ? (
          <span className="flex items-center gap-1 text-slate-600">
            <FaSuitcase size={9} className="text-blue-400 shrink-0" />
            {flight.baggage}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      {/* Meal */}
      <td className="px-2 md:px-3 py-2 md:py-3 hidden md:table-cell">
        {flight.meal?.toLowerCase() === "yes" ? (
          <span className="flex items-center gap-1 text-green-600 font-semibold">
            <FaUtensils size={8} /> Yes
          </span>
        ) : flight.meal ? (
          <span className="text-slate-500">{flight.meal}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}

function PricePill({ label, value, currency }) {
  return (
    <div className="flex flex-col items-center bg-green-50 rounded px-2 py-1 leading-tight min-w-11">
      <span className="text-[8px] text-green-700 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xs font-bold text-green-600">
        {value.toLocaleString()}
      </span>
      <span className="text-[8px] text-green-600">{currency}</span>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import {
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
import { Filter, RotateCcw, Search, Ticket } from "lucide-react";

export default function GroupTicketingPage({ user }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [currentTime, setCurrentTime] = useState(null);
  const [dbMargin, setDbMargin] = useState(null);
  const calculateB2BPrice = (groupPrice, group = {}) => {
    if (!groupPrice) return null; // 0 means price on call / not set
    if (!user) return groupPrice; // B2C case (handled separately)
    if (user?.priceOnCall) return null;

    let finalPrice = groupPrice;

    // Priority 1: Agent-specific margin
    const marginType = user.marginType; // "Percentage" or "Amount"
    const marginPercent = user.flightMarginPercent;
    const marginAmount = user.flightMarginAmount;

    if (marginType === "Percentage" && marginPercent > 0) {
      finalPrice = groupPrice + (groupPrice * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      finalPrice = groupPrice + marginAmount;
    }

    // Priority 2: Individual group margin (only when no agent margin applied)
    if (finalPrice === groupPrice) {
      const indMargin = group?.individualMargin;
      if (indMargin !== null && indMargin !== undefined) {
        finalPrice = groupPrice + indMargin;
      }
    }

    // Priority 3: Global/overall margin (fallback)
    if (finalPrice === groupPrice && dbMargin) {
      if (dbMargin.type === "percent" && dbMargin.value > 0) {
        finalPrice = groupPrice + (groupPrice * dbMargin.value) / 100;
      } else if (dbMargin.type === "amount" && dbMargin.value > 0) {
        finalPrice = groupPrice + dbMargin.value;
      }
    }

    return Math.round(finalPrice);
  };
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setCurrentTime(Date.now());
      const [res, marginRes] = await Promise.all([
        axiosInstance.get("/zip-accounts/group-ticketing"),
        axiosInstance.get("/sector/getMargin"),
      ]);
      if (marginRes.data?.success) setDbMargin(marginRes.data.data);
      const data = res.data;
      if (data?.success) {
        setGroups(data.data?.filter((item) => item?.internalStatus === "Active"));
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

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = window.setTimeout(fetchGroups, 0);

    return () => window.clearTimeout(timer);
  }, []);

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

  const getDepartureSortValue = (dateStr, timeStr = "00:00") => {
    if (!dateStr) return Number.MAX_SAFE_INTEGER;

    const dateOnly = String(dateStr).split("T")[0];
    const parsed = Date.parse(`${dateOnly}T${timeStr || "00:00"}`);

    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  };

  const getGroupDepartureSortValue = (group) => {
    const flightDepartureValues =
      group.flights
        ?.map((flight) =>
          getDepartureSortValue(flight.departureDate, flight.departureTime)
        )
        .filter((value) => value !== Number.MAX_SAFE_INTEGER) || [];

    if (flightDepartureValues.length > 0) {
      return Math.min(...flightDepartureValues);
    }

    return getDepartureSortValue(group.departureDate || group.dept_date);
  };

  const isGroupDepartureUpcoming = (group) => {
    const departureValue = getGroupDepartureSortValue(group);

    return (
      departureValue === Number.MAX_SAFE_INTEGER ||
      currentTime === null ||
      departureValue >= currentTime
    );
  };

  const airlines = [
    ...new Set(groups.map((g) => g.airline).filter(Boolean).sort()),
  ];
  const sectors = [
    ...new Set(groups.map((g) => g.sector).filter(Boolean).sort()),
  ];
  const hasActiveFilters =
    search || selectedSectors.length > 0 || selectedAirlines.length > 0;

  const filtered = groups
    .filter(isGroupDepartureUpcoming)
    .filter((g) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        g.groupName?.toLowerCase().includes(q) ||
        g.sector?.toLowerCase().includes(q) ||
        g.airline?.toLowerCase().includes(q) ||
        g.documentNumber?.toLowerCase().includes(q) ||
        g.pnr?.toLowerCase().includes(q);
      const matchSector =
        selectedSectors.length === 0 || selectedSectors.includes(g.sector);
      const matchAirline =
        selectedAirlines.length === 0 || selectedAirlines.includes(g.airline);
      return matchSearch && matchSector && matchAirline;
    })
    .sort(
      (a, b) => getGroupDepartureSortValue(a) - getGroupDepartureSortValue(b)
    );

  const toggleFilterValue = (value, setSelectedValues) => {
    setSelectedValues((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedSectors([]);
    setSelectedAirlines([]);
  };

  return (
    <>
      <TopBar
        title={"Group Ticketing"}
        icon={<Ticket className="text-white w-6 h-6" />}
      />
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
            <aside className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Filter size={16} />
                  </span>
                  <h2 className="text-sm font-bold text-slate-800">Filters</h2>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-600 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label
                    htmlFor="group-ticket-search"
                    className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5"
                  >
                    Search
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="group-ticket-search"
                      type="text"
                      placeholder="Group, sector, airline, PNR"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-700 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                </div>

                <CheckboxFilterGroup
                  title="Sector"
                  emptyLabel="All Sectors"
                  options={sectors}
                  selectedValues={selectedSectors}
                  onToggle={(sector) =>
                    toggleFilterValue(sector, setSelectedSectors)
                  }
                  onClear={() => setSelectedSectors([])}
                />

                <CheckboxFilterGroup
                  title="Airline"
                  emptyLabel="All Airlines"
                  options={airlines}
                  selectedValues={selectedAirlines}
                  onToggle={(airline) =>
                    toggleFilterValue(airline, setSelectedAirlines)
                  }
                  onClear={() => setSelectedAirlines([])}
                />
              </div>


            </aside>

            <div className="min-w-0">
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
                      calculateB2BPrice={calculateB2BPrice}
                      getDepartureSortValue={getDepartureSortValue}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CheckboxFilterGroup({
  title,
  emptyLabel,
  options,
  selectedValues,
  onToggle,
  onClear,
}) {
  const groupId = title.toLowerCase();

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        {selectedValues.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
          >
            Clear
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <label
          htmlFor={`${groupId}-all`}
          className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <input
            id={`${groupId}-all`}
            type="checkbox"
            checked={selectedValues.length === 0}
            onChange={onClear}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600"
          />
          <span className="flex-1">{emptyLabel}</span>
          <span className="text-[10px] font-bold text-slate-400">
            {options.length}
          </span>
        </label>

        {options.length > 0 ? (
          <div className="max-h-48 overflow-y-auto border-t border-slate-100">
            {options.map((option) => (
              <label
                key={option}
                htmlFor={`${groupId}-${option}`}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50/60 cursor-pointer"
              >
                <input
                  id={`${groupId}-${option}`}
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => onToggle(option)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                <span className="flex-1 truncate" title={option}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
            No options available
          </p>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  formatDate,
  formatTime,
  navigate,
  calculateB2BPrice,
  getDepartureSortValue,
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    pricing,
    flights = [],
    showSeats,
    remainingSeats,
  } = group;

  const sortedFlights = [...flights].sort(
    (a, b) =>
      getDepartureSortValue(a.departureDate, a.departureTime) -
      getDepartureSortValue(b.departureDate, b.departureTime)
  );
  const visibleFlights = expanded ? sortedFlights : sortedFlights.slice(0, 2);

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
      dept_date: sortedFlights?.[0]?.departureDate || "",
      arv_date: sortedFlights?.[sortedFlights.length - 1]?.arrivalDate || "",
      // Transform flights array to match BookingForm structure
      details:
        sortedFlights?.map((flight) => ({
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
      available_no_of_pax: group.remainingSeats ?? group.seats ?? 0,
      bookedSeats: group.bookedSeats ?? 0,
      totalSeats: group.seats ?? 0,
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
          <img
            src={
              group.airline?.toLowerCase().trim() === "air sial"
                ? "https://www.airsial.com/front/images/logo.png"
                : `https://img.wway.io/pics/root/${group.airlineCode}@png?exar=1&rs=fit:80:40`
            }
            alt={group.airline || group.airlineCode}
            style={{ height: 32, maxWidth: 80, objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-600 rounded-full uppercase tracking-wide">
            {group.groupCategory || group.type || "Group"}
          </span>
          {group.groupName && (
            <span className="text-xs md:text-sm font-medium text-slate-700">
              {group.groupName}
            </span>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs md:text-sm font-semibold text-slate-700 tracking-wider">
              {group.sector}
            </span>

            {/* {noOfDays && (
              <span className="text-[10px] md:text-xs text-slate-700 bg-white px-2 py-1 rounded-full shadow-sm">
                {noOfDays} days
              </span>
            )} */}
          </div>
        </div>

        {/* Right: route + pricing + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* Pricing Section */}
          {/* Seats badge */}
          {showSeats && remainingSeats != null && (
            <span className="text-[10px] md:text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full whitespace-nowrap shadow-sm">
              {remainingSeats} seats left
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
          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            {pricing && (
              <div className="flex items-center gap-2">
                {pricing.sellingAdultB2B != null && (
                  <PricePill
                    label="Adult"
                    value={
                      calculateB2BPrice
                        ? calculateB2BPrice(pricing.sellingAdultB2B, group)
                        : pricing.sellingAdultB2B
                    }
                    currency={pricing.sellingCurrencyB2B}
                  />
                )}
                {pricing.sellingChildB2B > 0 && (
                  <PricePill
                    label="Child"
                    value={
                      calculateB2BPrice
                        ? calculateB2BPrice(pricing.sellingChildB2B, group)
                        : pricing.sellingChildB2B
                    }
                    currency={pricing.sellingCurrencyB2B}
                  />
                )}
                {pricing.sellingInfantB2B > 0 && (
                  <PricePill
                    label="Infant"
                    value={
                      calculateB2BPrice
                        ? calculateB2BPrice(pricing.sellingInfantB2B, group)
                        : pricing.sellingInfantB2B
                    }
                    currency={pricing.sellingCurrencyB2B}
                  />
                )}
              </div>
            )}

            <button
              onClick={handleSelectGroup}
              disabled={remainingSeats <= 0}
              className={`text-xs md:text-sm font-bold px-4 md:px-6 py-2 md:py-2.5 rounded-lg transition-all shadow-md whitespace-nowrap ${
                remainingSeats <= 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-linear-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:scale-105 active:scale-95"
              }`}
            >
              {remainingSeats <= 0 ? "Sold Out" : "Select & Book"}
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
                formatDate={formatDate}
                formatTime={formatTime}
                isLast={i === visibleFlights.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand toggle for 3+ flights */}
      {sortedFlights.length > 2 && (
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
                <FaChevronDown size={10} /> +{sortedFlights.length - 2} More Flights
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
          {/* {flight.fromTerminal && (
                        <span className="text-[9px] text-slate-400 hidden sm:inline">
                            ({flight.fromTerminal})
                        </span>
                    )} */}
          <span className="text-slate-300 text-[10px]">→</span>
          <span>{flight.sectorTo}</span>
          {/* {flight.toTerminal && (
                        <span className="text-[9px] text-slate-400 hidden sm:inline">
                            ({flight.toTerminal})
                        </span>
                    )} */}
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
    <div className="flex flex-col items-center rounded px-2 py-1 leading-tight min-w-11">
      <span className="text-[8px] uppercase tracking-wide">{label}</span>
      {value == null || value === 0 ? (
        <span className="text-xs font-bold text-amber-600">On Call</span>
      ) : (
        <span className="text-xs font-bold">
          {currency}
          {"      "}
          {value.toLocaleString()}
        </span>
      )}
    </div>
  );
}

import axiosInstance from "../api/axios";
import airlineData from "../data/Airlines";

const loadImageAsDataUrl = async (logoUrl, fallbackUrl = "") => {
    const urls = [logoUrl, fallbackUrl].filter(Boolean);
    const apiBaseUrl = axiosInstance.defaults.baseURL || "";
    const token = localStorage.getItem("frontend_token");

    for (const url of urls) {
        if (url.startsWith("data:")) return url;

        try {
            const headers = {};
            const isApiFile = url.includes("/api/") || (apiBaseUrl && url.startsWith(apiBaseUrl));

            if (token && isApiFile) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                mode: "cors",
                cache: "force-cache",
                credentials: isApiFile ? "include" : "same-origin",
                headers,
            });
            if (!response.ok) continue;

            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            if (dataUrl) return dataUrl;
        } catch (error) {
            console.warn("Logo could not be embedded for print", url, error);
        }
    }

    return fallbackUrl || logoUrl || "";
};

export const printGDSBooking = async (booking) => {
    // --- 1. Helper Functions ---
    const formatFullDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // --- 2. Data Preparation (Preserving your logic + adding PDF specific helpers) ---
    const bookingMeta = booking.metadata || {};
    const originalPkg = bookingMeta.originalPkg || {};
    const originalVoucher = originalPkg.originalVoucher || {};
    const preferredFlightSource =
        booking.flights ||
        originalPkg.flights ||
        originalVoucher.flights ||
        [];

    const flightSegments = Array.isArray(preferredFlightSource)
        ? preferredFlightSource.filter(Boolean)
        : preferredFlightSource
            ? [preferredFlightSource]
            : [];

    const parseDateValue = (value) => {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    };

    const sortFlightsByDeparture = (a, b) => {
        const aDate = parseDateValue(a?.departureDate || a?.depDate || a?.flight_date || a?.departure_time || a?.departureTime || a?.departureDate);
        const bDate = parseDateValue(b?.departureDate || b?.depDate || b?.flight_date || b?.departure_time || b?.departureTime || b?.departureDate);
        if (aDate && bDate) return aDate - bDate;
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
    };

    if (flightSegments.length > 1) {
        flightSegments.sort(sortFlightsByDeparture);
    }

    const firstFlight = flightSegments[0] || {};
    const lastFlight = flightSegments[flightSegments.length - 1] || firstFlight;

    // Booking Status
    const bookingStatusRaw = (booking.status || booking.bookingStatus || bookingMeta.status || "N/A").toUpperCase();
    const isOnHold = bookingStatusRaw.toLowerCase().includes("hold") || bookingStatusRaw.toLowerCase() === "pending";
    const bookingStatus = isOnHold ? "ON HOLD" : bookingStatusRaw;

    // Airline & Logos
    const airlineNameRaw =
        typeof booking.airline === "string"
            ? booking.airline
            : booking.airline?.name ||
            booking.airline?.airline_name ||
            booking.airline?.airline ||
            bookingMeta.airlineName ||
            originalPkg.airlineName ||
            originalPkg.airline ||
            originalVoucher.airline ||
            firstFlight.airlineName ||
            "";
    const airlineName = airlineNameRaw.toUpperCase() || "AIRLINE";
    const airlineShortCode =
        typeof booking.airline === "string"
            ? booking.airline
            : booking.airline?.shortcode ||
            booking.airline?.code ||
            booking.airline?.airlineCode ||
            bookingMeta.airlineCode ||
            originalPkg.airlineCode ||
            firstFlight.airlineCode ||
            booking.airlineCode ||
            "";

    const normalizeValue = (value) => {
        return typeof value === "string" ? value.toLowerCase().trim() : "";
    };

    const normalizeAirlineKey = (value) => {
        return normalizeValue(value).replace(/[^a-z0-9]/g, "");
    };

    const airlineLookup = airlineData.reduce((acc, entry) => {
        const logoCode = entry.shortcode ? String(entry.shortcode).trim() : "";

        if (!logoCode) return acc;

        [entry.airline, entry.shortcode].forEach((value) => {
            const exactKey = normalizeValue(value);
            const compactKey = normalizeAirlineKey(value);

            if (exactKey) acc.set(exactKey, logoCode);
            if (compactKey) acc.set(compactKey, logoCode);
        });

        return acc;
    }, new Map());

    const lookupAirlineCode = (...values) => {
        for (const value of values) {
            const exactKey = normalizeValue(value);
            const compactKey = normalizeAirlineKey(value);

            if (exactKey && airlineLookup.has(exactKey)) {
                return airlineLookup.get(exactKey);
            }
            if (compactKey && airlineLookup.has(compactKey)) {
                return airlineLookup.get(compactKey);
            }
        }

        return "";
    };

    const isLogoApiCode = (value) => /^\d+$/.test(String(value || "").trim());
    const rawAirlineCode =
        booking.airlineCode ||
        bookingMeta.airlineCode ||
        originalPkg.airlineCode ||
        firstFlight.airlineCode ||
        booking.airline?.airlineCode ||
        booking.airline?.code ||
        booking.airline?.id ||
        "";
    const mappedAirlineCode = lookupAirlineCode(
        airlineNameRaw,
        airlineShortCode,
        booking.airlineName,
        booking.airline,
        firstFlight.airlineName,
        rawAirlineCode,
    );
    const airlineCode = mappedAirlineCode || (isLogoApiCode(rawAirlineCode) ? String(rawAirlineCode).trim() : "");

    const apiOrigin = (() => {
        const baseURL = axiosInstance.defaults.baseURL || "";
        const trimmed = baseURL.replace(/\/api\/?$/, "");
        return trimmed || window.location.origin;
    })();

    const airlineLogoOverrides = {
        "air sial": "https://www.airsial.com/front/images/logo.png",
    };

    const lookupOverrideLogo = (name) => {
        return airlineLogoOverrides[normalizeValue(name)] || "";
    };

    const resolveLogoUrl = (logoValue) => {
        if (!logoValue) return "";
        if (typeof logoValue === "object") {
            if (logoValue.url || logoValue.logoUrl) return resolveLogoUrl(logoValue.url || logoValue.logoUrl);
            if (logoValue.fileName) return resolveLogoUrl(`/api/files/${logoValue.fileName}`);
            if (logoValue.path) return resolveLogoUrl(logoValue.path);
            return "";
        }
        if (typeof logoValue !== "string") return "";
        if (logoValue.startsWith("data:") || logoValue.startsWith("http://") || logoValue.startsWith("https://")) {
            return logoValue;
        }
        if (logoValue.startsWith("/")) {
            return `${apiOrigin}${logoValue}`;
        }
        if (logoValue.startsWith("api/")) {
            return `${apiOrigin}/${logoValue}`;
        }
        return `${apiOrigin}/api/files/${logoValue}`;
    };

    const defaultLogo = resolveLogoUrl(
        booking.agencyLogo ||
        bookingMeta.img ||
        originalPkg.img ||
        booking.logoUrl ||
        booking.companyLogo ||
        new URL("../assets/images/logo.webp", import.meta.url).href,
    );

    const airlineLogoValue =
        lookupOverrideLogo(booking.airlineName || airlineNameRaw) ||
        (airlineCode
            ? `https://img.wway.io/pics/root/${airlineCode}@png?exar=1&rs=fit:80:40`
            : "") ||
        bookingMeta.airline?.logo_url ||
        bookingMeta.airline?.logoUrl ||
        originalPkg.airline?.logo_url ||
        originalPkg.airline?.logoUrl ||
        booking.airline?.logoUrl ||
        booking.airline?.logo_url ||
        booking.airline?.logo ||
        booking.airline?.airlineLogo ||
        firstFlight.airlineLogo ||
        firstFlight.logoUrl ||
        firstFlight.logo_url ||
        defaultLogo;

    const resolvedLogo = await loadImageAsDataUrl(resolveLogoUrl(airlineLogoValue), defaultLogo);

    // Booking Ref / PNR
    const pnr =
        booking.pnr ||
        bookingMeta.pnr ||
        originalPkg.pnr ||
        originalVoucher.pnr ||
        booking.bookingReference ||
        "N/A";
    const isConfirmed = bookingStatusRaw.toLowerCase() === "confirmed" || bookingStatusRaw.toLowerCase() === "completed";
    const refLabel = isConfirmed ? "PNR" : "BOOKING REF";
    const bookingRef = isOnHold
        ? "HOLD"
        : isConfirmed
            ? pnr
            : booking.bookingId || booking.refNo || booking.bookingReference || bookingMeta.bookingNumber || "N/A";

    // Flight Details Helpers
    const getFlightValue = (segment, ...keys) => {
        for (const key of keys) {
            const value = segment?.[key];
            if (value !== undefined && value !== null && `${value}`.toString().trim() !== "") {
                return value;
            }
        }
        return "";
    };

    const flightNum = booking.flightNumber || getFlightValue(firstFlight, "flightNo", "flight_number", "flight_no", "flightNumber") || "XX000";

    const buildRouteSegment = (segment) => {
        const originCity = getFlightValue(segment, "origin", "sectorFrom", "from", "fromCity", "departureCity") || "N/A";
        const destCity = getFlightValue(segment, "destination", "sectorTo", "to", "toCity", "arrivalCity") || "N/A";
        return `${originCity} → ${destCity}`;
    };

    const flightRouteSummary = flightSegments.map(buildRouteSegment).join(" / ");

    const extractSectorCodes = (sectorString) => {
        if (!sectorString) return [];
        const normalized = String(sectorString).trim();
        const match = normalized.match(/([A-Z]{3})\s*[-/]\s*([A-Z]{3})/i);
        if (match) return [match[1].toUpperCase(), match[2].toUpperCase()];
        const fallbackMatch = normalized.match(/\b([A-Z]{3})\b.*\b([A-Z]{3})\b/i);
        if (fallbackMatch) return [fallbackMatch[1].toUpperCase(), fallbackMatch[2].toUpperCase()];
        return [];
    };

    const isIataCode = (value) => {
        const code = String(value || "").trim().toUpperCase();
        return /^[A-Z]{3}$/.test(code);
    };

    const normalizeCode = (value) => {
        const code = String(value || "").trim().toUpperCase();
        return isIataCode(code) ? code : "";
    };

    const origin = (
        getFlightValue(firstFlight, "origin", "sectorFrom", "from", "fromCity", "departureCity") || booking.origin || booking.originCity || ""
    ).toUpperCase();

    let originCode = (
        getFlightValue(
            firstFlight,
            "originCode",
            "origin_code",
            "originIata",
            "origin_iata",
            "departureCode",
            "departure_code",
            "sectorFrom",
        ) || booking.originCode || booking.originIata || booking.sectorFrom || ""
    );
    originCode = normalizeCode(originCode);

    const dest = (
        getFlightValue(lastFlight, "destination", "sectorTo", "to", "toCity", "arrivalCity") || booking.destination || booking.destinationCity || ""
    ).toUpperCase();

    let destCode = (
        getFlightValue(
            lastFlight,
            "destinationCode",
            "destination_code",
            "destinationIata",
            "destination_iata",
            "arrivalCode",
            "arrival_code",
            "sectorTo",
        ) || booking.destinationCode || booking.destinationIata || booking.sectorTo || ""
    );
    destCode = normalizeCode(destCode);

    const [parsedOrigin, parsedDest] = extractSectorCodes(
        booking.sector || bookingMeta.sector || originalPkg.sector || firstFlight.sector || "",
    );

    if ((!originCode || !originCode.trim()) && parsedOrigin) {
        originCode = parsedOrigin;
    }
    if ((!destCode || !destCode.trim()) && parsedDest) {
        destCode = parsedDest;
    }

    if (originCode && destCode && originCode === destCode && parsedDest && parsedDest !== originCode) {
        destCode = parsedDest;
    }

    originCode = originCode || "N/A";
    destCode = destCode || "N/A";

    const depTime = getFlightValue(firstFlight, "depTime", "departureTime", "departure_time", "dep_time") || booking.depTime || "00:00";
    const arrTime = getFlightValue(lastFlight, "arrTime", "arrivalTime", "arrival_time", "arr_time") || booking.arrTime || "00:00";
    const depDate = formatFullDate(getFlightValue(firstFlight, "departureDate", "depDate", "flight_date") || booking.departureDate);
    const arrDate = formatFullDate(getFlightValue(lastFlight, "arrivalDate", "arrDate") || booking.arrivalDate || booking.departureDate);

    const baggage = booking.baggageWeight || getFlightValue(firstFlight, "baggage", "baggageWeight") || "20KG";
    const sector = `${originCode} - ${destCode} - ${originCode}`;

    // Plane Icon (Base64 from your PDF code)
    const planeIconBase64 =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBzdHlsZT0idHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpOyI+PHBhdGggZD0iTTIxIDE2di0ybC04LTVWMy41YzAtLjgzLS42Ny0xLjUtMS41LTEuNVMxMCAyLjY3IDEwIDMuNVY5TDIgMTR2Mmw4LTIuNVYxOWwtMiAxLjVWMjJsMy41LTEgMy41IDF2LTEuNUwxMyAxOXYtNS41bDggMi41eiIvPjwvc3ZnPg==";

    // Passengers (use booking-level and metadata-level arrays)
    const passengers =
        (booking.passengers && booking.passengers.length > 0)
            ? booking.passengers
            : (bookingMeta.passengers && bookingMeta.passengers.length > 0)
                ? bookingMeta.passengers
                : [
                    {
                        title: bookingMeta.passengers?.[0]?.title || "",
                        givenName: bookingMeta.passengers?.[0]?.givenName || "PASSENGER",
                        surName: bookingMeta.passengers?.[0]?.surName || "NAME",
                        passport: "N/A",
                        type: "Adult",
                        nationality: "N/A",
                    },
                ];

    // Frontend user fallback (safe parse)
    const storedFrontendUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("frontend_user") || "{}");
        } catch (e) {
            return {};
        }
    })();

    const bookingContext = {
        ...booking,
        userId: booking.userId || bookingMeta.userId,
        contactEmail: booking.contactEmail || bookingMeta.createdBy || bookingMeta.email,
        email: booking.email || bookingMeta.createdBy || bookingMeta.email,
        phone: booking.phone || bookingMeta.phone,
        agencyName: booking.agencyName || bookingMeta.agencyName,
    };

    // --- 3. Construct the HTML String (PDF Design -> Black & White) ---
    const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Print Ticket</title>
    <style>
        @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 13px;
            color: #333;
            line-height: 1.5;
            background: #fff;
            margin: 0;
            padding: 40px;
        }

        /* 1. Header Section */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand img { height: 40px; }
        .brand-text h1 { margin: 0; font-size: 20px; color: #8c8c8c; font-weight: bold; }
        .brand-text p { margin: 0; font-size: 11px; color: #b0b0b0; }
        
        .ref-box { text-align: right; }
        .ref-label { font-size: 13px; font-weight: bold; color: #8c8c8c; }
        .ref-value { font-size: 24px; font-weight: bold; color: #505050; margin-top: -2px; }

        /* 2. Top Summary Boxes */
        .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .sum-card { 
            border: 1px solid black; 
            border-radius: 12px; 
            padding: 15px; 
            text-align: center; 
            min-width: 0;
            word-break: break-word;
        }
        .sum-label, .sum-val { white-space: normal; overflow: visible; text-overflow: unset; }
        .sum-label { font-size: 10px; font-weight: bold; color: #b0b0b0; text-transform: uppercase; margin-bottom: 4px; }
        .sum-val { font-size: 15px; font-weight: bold; color: #333; }

        /* 3. Section Styling */
        .section-title { 
            font-size: 12px; 
            font-weight: 800; 
            color: #333; 
            margin-bottom: 12px; 
            text-transform: uppercase;
            border-bottom: 2px solid black;
            padding-bottom: 5px;
        }

        /* 4. Table Design (Clean - No Vertical Lines) */
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { 
            text-align: left; 
            font-size: 11px; 
            color: #b0b0b0; 
            font-weight: normal; 
            padding: 8px 0; 
            border-bottom: 2px solid black;
        }
        td { padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #444; }
        .bold-td { font-weight: bold; color: #000; }

        /* 5. Details Section */
        .info-block { margin-bottom: 20px; }
        .info-title { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #333; }
        .info-row { font-size: 14px; margin-bottom: 6px; }
        .info-row span { font-weight: bold; }

        /* Important list dots */
        .imp-list { padding-left: 18px; margin: 5px 0; }
        .imp-list li { font-size: 12px; color: #555; margin-bottom: 4px; }

        /* 6. Location Pill at Bottom */
        .pill-address {
            display: inline-flex;
            align-items: center;
            border: 1px solid #8c8c8c;
            border-radius: 50px;
            padding: 5px 15px;
            margin-top: 15px;
            font-size: 11px;
            color: #8c8c8c;
            font-weight: bold;
            gap: 6px;
        }
        .pin { color: #e74c3c; font-size: 14px; }
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto;">
        
        <!-- Header -->
        <div class="header">
            <div class="brand">
                <img src="${resolvedLogo}" alt="Booking Logo" />
                <div class="brand-text">
                    <h1>${airlineName}</h1>
                    <p>Electronic Ticket / Itinerary Receipt</p>
                </div>
            </div>
            <div class="ref-box">
                <div class="ref-label">BOOKING REF</div>
                <div class="ref-value">${bookingRef}</div>
            </div>
        </div>

        <!-- Summary Row -->
        <div class="summary-row">
            <div class="sum-card">
                <div style="color: black;" class="sum-label">FLIGHT</div>
                <div class="sum-val">${airlineName} ${flightNum}</div>
            </div>
            <div class="sum-card">
                <div style="color: black;" class="sum-label">ROUTE</div>
                <div class="sum-val">${sector}</div>
            </div>
            <div class="sum-card">
                <div style="color: black;" class="sum-label">STATUS</div>
                <div class="sum-val">${bookingStatus}</div>
            </div>
        </div>

        <!-- Flight Segments -->
        <div class="section-title">FLIGHT SEGMENTS</div>
        <table>
            <thead>
                <tr>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Airline</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Flight</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Route</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Departure Date</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Departure Time</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Arrival Time</th>
                </tr>
            </thead>
            <tbody>
                ${flightSegments.map((flightData) => {
        const flightRoute = `${getFlightValue(flightData, "origin", "sectorFrom", "from", "fromCity", "departureCity") || "N/A"} - ${getFlightValue(flightData, "destination", "sectorTo", "to", "toCity", "arrivalCity") || "N/A"}`;
        const flightDepartureDate = formatFullDate(getFlightValue(flightData, "departureDate", "depDate", "flight_date") || booking.departureDate);
        const flightArrivalDate = formatFullDate(getFlightValue(flightData, "arrivalDate", "arrDate") || booking.arrivalDate || getFlightValue(flightData, "departureDate", "depDate", "flight_date"));
        const flightDepartureTime = getFlightValue(flightData, "depTime", "departureTime", "departure_time", "dep_time") || booking.depTime || "00:00";
        const flightArrivalTime = getFlightValue(flightData, "arrTime", "arrivalTime", "arrival_time", "arr_time") || booking.arrTime || "00:00";
        const flightNumber = getFlightValue(flightData, "flightNo", "flight_number", "flight_no", "flightNumber") || booking.flightNumber || "XX000";
        return `
                        <tr>
                            <td>${airlineName}</td>
                            <td>${flightNumber}</td>
                            <td>${flightRoute}</td>
                            <td>${flightDepartureDate}</td>
                            <td>${flightDepartureTime}</td>
                            <td>${flightArrivalTime}</td>
                        </tr>
                    `;
    }).join("")}
            </tbody>
        </table>

        <!-- Passenger(s) -->
        <div class="section-title">PASSENGER(S)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 40%; color: black; font-size: 13px; font-weight: bold;">Name</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Type</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Passport</th>
                    <th style="color: black; font-size: 13px; font-weight: bold;">Nationality</th>
                </tr>
            </thead>
            <tbody>
                ${passengers.map(p => {
        const passengerName =
            p.name ||
            [p.title, p.givenName, p.surName].filter(Boolean).join(" ") ||
            "PASSENGER";
        return `
                    <tr>
                        <td class="bold-td">${passengerName}</td>
                        <td>${p.type || "Adult"}</td>
                        <td>${p.passport || "N/A"}</td>
                        <td>${p.nationality || "N/A"}</td>
                    </tr>
                `;
    }).join('')}
            </tbody>
        </table>

        <!-- Issued By -->
        <div class="info-block">
            <div class="info-title">ISSUED BY</div>
            <div class="info-row">Agent Name: <span>${getName(bookingContext)}</span></div>
            <div class="info-row">Contact Email: <span>${getAgencyEmail(bookingContext)}</span></div>
            <div class="info-row">Phone: <span>${getAgencyPhone(bookingContext)}</span></div>
        </div>

        <!-- Important -->
        <div class="info-block">
            <div class="info-title">IMPORTANT</div>
            <ul class="imp-list">
                <li>Arrive at the airport at least 4 hours before departure.</li>
                <li>Valid government photo ID is required.</li>
                <li>Baggage allowances may vary by airline and fare.</li>
            </ul>
        </div>

   

    </div>
</body>
</html>
`;
    // --- 4. The Iframe Trick ---
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    let didPrint = false;

    const waitForImages = async () => {
        const images = Array.from(iframe.contentWindow.document.querySelectorAll("img"));

        await Promise.race([
            Promise.all(
                images.map((image) => {
                    if (image.complete && image.naturalWidth > 0) {
                        return image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
                    }

                    return new Promise((resolve) => {
                        image.onload = () => resolve();
                        image.onerror = () => resolve();
                    });
                }),
            ),
            new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
    };

    const printDocument = async () => {
        if (didPrint) return;
        didPrint = true;

        try {
            await waitForImages();
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            console.error("Print failed", e);
        } finally {
            setTimeout(() => {
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        }
    };

    iframe.onload = printDocument;

    doc.open();
    doc.write(ticketHTML);
    doc.close();

    setTimeout(printDocument, 100);
};




const getAgencyName = (booking) => {
    const storedFrontendUser = getStoredFrontendUser();

    if (typeof booking.userId === "object" && booking.userId?.companyName) {
        return booking.userId.companyName;
    }
    if (booking.agencyName) {
        return booking.agencyName;
    }
    if (storedFrontendUser.companyName) {
        return storedFrontendUser.companyName;
    }
    return "SUPRA TRAVEL & TOURS";
};


const getStoredFrontendUser = () => {
    try {
        return JSON.parse(localStorage.getItem("frontend_user") || "{}");
    } catch {
        return {};
    }
};


const getName = (booking) => {
    const storedFrontendUser = getStoredFrontendUser();

    if (typeof booking.userId === "object" && booking.userId?.name) {
        return booking.userId.name;
    }
    if (booking.contactPersonName) {
        return booking.contactPersonName;
    }
    if (booking.issuedBy) {
        return booking.issuedBy;
    }
    if (storedFrontendUser.name) {
        return storedFrontendUser.name;
    }
    if (storedFrontendUser.companyName) {
        return storedFrontendUser.companyName;
    }
    return "SUPRA TRAVEL & TOURS";
};

const getAgencyEmail = (booking) => {
    const storedFrontendUser = getStoredFrontendUser();

    if (typeof booking.userId === "object" && booking.userId?.email) {
        return booking.userId.email;
    }
    if (booking.email) {
        return booking.email;
    }
    if (booking.contactEmail) {
        return booking.contactEmail;
    }
    if (storedFrontendUser.email) {
        return storedFrontendUser.email;
    }
    return "N/A";
};

const getAgencyPhone = (booking) => {
    const storedFrontendUser = getStoredFrontendUser();

    if (typeof booking.userId === "object" && booking.userId?.phone) {
        return booking.userId.phone;
    }
    if (booking.phone) {
        return booking.phone;
    }
    if (booking.contactPhone) {
        return booking.contactPhone;
    }
    if (booking.contactNumber) {
        return booking.contactNumber;
    }
    if (storedFrontendUser.phone) {
        return storedFrontendUser.phone;
    }
    return "N/A";
};

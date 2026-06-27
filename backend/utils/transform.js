export const mapToHotelUmrahVoucherPayload = (data) => {
  // Parse packageData if it's a string
  const packageData =
    typeof data.packageData === "string"
      ? JSON.parse(data.packageData)
      : data.packageData;

  // Extract pricing information from selected room type or fallback
  const roomTypes = packageData?.roomTypes || packageData?.rooms || {};
  const totalRooms = packageData?.totalRooms || 0;
  const selectedRoomType = data.roomType || "sharing"; // Room type selected by user

  // Calculate price per person based on selected room type
  const pricePerPerson = parseFloat(
    data.pricing?.pricePerPerson ||
      roomTypes?.[selectedRoomType] ||
      roomTypes?.double ||
      roomTypes?.triple ||
      roomTypes?.quad ||
      roomTypes?.sharing ||
      packageData?.price ||
      0,
  );

  const totalAmount = parseFloat(data.pricing?.totalAmount || pricePerPerson);
  const currency = data.pricing?.currency || "PKR";

  // Passenger counts
  const passengers = data.passengers || [];
  const adults = passengers.filter((p) => p.type === "Adult").length;
  const children = passengers.filter((p) => p.type === "Child").length;
  const infants = passengers.filter((p) => p.type === "Infant").length;
  const totalPassengers = adults + children + infants;

  // Parse dates - handle multiple date formats
  const parseDepartureDate =
    packageData?.departureDate ||
    packageData?.dept_date ||
    packageData?.flight_date ||
    "";
  const parseArrivalDate =
    packageData?.arrivalDate || packageData?.returnDate || "";

  // Calculate checkout date from departure + duration
  const packageDuration = packageData?.packageDuration || 0;
  let checkOutDate = parseArrivalDate;
  if (!checkOutDate && parseDepartureDate && packageDuration) {
    const deptDate = new Date(parseDepartureDate);
    deptDate.setDate(deptDate.getDate() + packageDuration);
    checkOutDate = deptDate.toISOString();
  }

  // Customer Account - from user field (ID)
  const customerAccountId = data.user || null;

  // Extract and map hotels with complete information
  const hotelsData = packageData?.hotels || packageData?.metadata?.hotels || [];
  const hotels = hotelsData.map((hotel, index) => {
    const hotelName = hotel.hotelName || hotel.name || "";
    const city = hotel.city || hotel.location?.city || "";
    const supplierAccount = hotel.account || hotel.supplierId || null;

    return {
      paxName: data.packageName || packageData?.packageName || "",
      hotelName: hotelName,
      city: city,
      country: hotel.country || "Saudi Arabia",
      checkIn: parseDepartureDate,
      checkOut: checkOutDate,
      checkInDate: parseDepartureDate,
      checkOutDate: checkOutDate,
      checkin: parseDepartureDate,
      checkout: checkOutDate,
      nights: hotel.nights || packageDuration || 0,
      rating: hotel.rating || 0,
      distance: hotel.distance || hotel.location?.distance || 0,
      googleMapsUrl: hotel.googleMapsUrl || "",
      netBuying: 0, // To be filled by user
      buyingPrice: 0,
      sellingPrice: pricePerPerson,
      supplier: supplierAccount,
      supplierAccount: supplierAccount,
      hotelId: hotel.hotelId || hotel._id || null,
      hotelConfirmationNumber: "",
      supplierConfirmationNumber: "",
      buyingExchangeRate: 1,
      sellingExchangeRate: 1,
      buyingCurrency: currency,
      sellingCurrency: currency,
    };
  });

  // Extract and map transports with complete information
  const transportsData =
    packageData?.transports || packageData?.metadata?.transports || [];
  const transports = transportsData.map((transport, index) => {
    const supplierAccount =
      transport.supplierId || transport.supplierAccount || null;

    return {
      paxName: data.packageName || packageData?.packageName || "",
      transportType: transport.transportType || "",
      vehicleType: transport.transportType || "",
      route: transport.sector || "",
      travelRoute: transport.sector || "",
      buyingPrice: transport.buyingPrice || 0,
      sellingPrice: transport.sellingPrice || 0,
      netBuying: transport.buyingPrice || 0,
      supplier: supplierAccount,
      supplierName: transport.supplierName || supplierAccount,
      supplierAccount: supplierAccount,
      tariffId: transport.tariffId || null,
      vehicleCount: transport.vehicleCount || 0,
      notes: transport.notes || "",
      pickupDate: parseDepartureDate,
      pickUpTime: "",
      buyingExchangeRate: 1,
      sellingExchangeRate: 1,
      buyingCurrency: currency,
      sellingCurrency: currency,
    };
  });

  // Extract flight information - map from both main package and flights array
  const mainFlightInfo = {
    flightNumber: packageData?.flightNumber || packageData?.voucher_id || "",
    sector: packageData?.sector || "",
    availableSeats:
      packageData?.availableSeats || packageData?.availableRooms || 0,
    ticketSupplier: packageData?.ticketSupplier || null,
  };

  const flightsData =
    packageData?.flights || packageData?.metadata?.flights || [];
  const flights = [
    // Map flights from the flights array
    ...flightsData.map((flight, index) => ({
      airline:
        packageData?.airlineName || packageData?.airline?.airline_name || "",
      flightno: flight.flightNumber || mainFlightInfo.flightNumber || "",
      sector: flight.sector || mainFlightInfo.sector || "",
      flightType: index === 0 ? "Departure" : "Return",
      departureDateTime: flight.departureDate || parseDepartureDate || "",
      arrivalDateTime: flight.arrivalDate || parseArrivalDate || "",
      availableSeats:
        flight.availableSeats || mainFlightInfo.availableSeats || 0,
      buyingPrice: 0, // To be filled
      sellingPrice: 0,
      pnr: "",
      supplier: mainFlightInfo.ticketSupplier,
      supplierAccount: mainFlightInfo.ticketSupplier,
      buyingExchangeRate: 1,
      sellingExchangeRate: 1,
      buyingCurrency: currency,
      sellingCurrency: currency,
    })),
    // If no flights array but main flight info exists, add it
    ...(flightsData.length === 0 && mainFlightInfo.flightNumber
      ? [
          {
            airline:
              packageData?.airlineName ||
              packageData?.airline?.airline_name ||
              "",
            flightno: mainFlightInfo.flightNumber || "",
            sector: mainFlightInfo.sector || "",
            flightType: "Return",
            departureDateTime: parseDepartureDate || "",
            arrivalDateTime: parseArrivalDate || "",
            availableSeats: mainFlightInfo.availableSeats || 0,
            buyingPrice: 0,
            sellingPrice: 0,
            pnr: "",
            supplier: mainFlightInfo.ticketSupplier,
            supplierAccount: mainFlightInfo.ticketSupplier,
            buyingExchangeRate: 1,
            sellingExchangeRate: 1,
            buyingCurrency: currency,
            sellingCurrency: currency,
          },
        ]
      : []),
  ];

  // Extract visa information (if available)
  const visasData = packageData?.visas || packageData?.metadata?.visas || [];
  const visaForms = visasData.map((visa) => ({
    paxName: visa.paxName || "",
    passport: visa.passport || "",
    vtype: visa.visaType || visa.vtype || "",
    country: visa.country || "",
    totalBuying1: visa.buyingPrice || visa.totalBuying1 || 0,
    totalSelling1: visa.sellingPrice || visa.totalSelling1 || 0,
    supplier: visa.supplierId || visa.supplier || null,
  }));

  // Calculate totals
  const totalHotelBuying = hotels.reduce(
    (sum, h) => sum + (h.netBuying || 0),
    0,
  );
  const totalHotelSelling = hotels.reduce(
    (sum, h) => sum + (h.sellingPrice || 0),
    0,
  );
  const totalTransportBuying = transports.reduce(
    (sum, t) => sum + (t.netBuying || 0),
    0,
  );
  const totalTransportSelling = transports.reduce(
    (sum, t) => sum + (t.sellingPrice || 0),
    0,
  );
  const totalFlightBuying = flights.reduce(
    (sum, f) => sum + (f.buyingPrice || 0) * (f.buyingExchangeRate || 1),
    0,
  );
  const totalVisaBuying = visaForms.reduce(
    (sum, v) => sum + (v.totalBuying1 || 0),
    0,
  );
  const totalVisaSelling = visaForms.reduce(
    (sum, v) => sum + (v.totalSelling1 || 0),
    0,
  );

  const totalBuyingPrice =
    totalHotelBuying +
    totalTransportBuying +
    totalFlightBuying +
    totalVisaBuying;
  const totalSellingPrice = totalAmount;

  // Calculate profit
  const finalProfit = totalSellingPrice - totalBuyingPrice;

  // Prepare selling prices by passenger type (proportional distribution)
  const sellingForeignPrices = {
    adult: adults > 0 ? pricePerPerson : 0,
    child: children > 0 ? pricePerPerson * 0.7 : 0, // Default 70% of adult price
    infant: infants > 0 ? pricePerPerson * 0.2 : 0, // Default 20% of adult price
  };

  // Collect all unique suppliers from services
  const uniqueSuppliers = new Set();

  // Add hotel suppliers
  hotels.forEach((hotel) => {
    if (hotel.supplier || hotel.supplierAccount) {
      uniqueSuppliers.add(hotel.supplier || hotel.supplierAccount);
    }
  });

  // Add transport suppliers
  transports.forEach((transport) => {
    if (transport.supplier || transport.supplierAccount) {
      uniqueSuppliers.add(transport.supplier || transport.supplierAccount);
    }
  });

  // Add flight suppliers
  flights.forEach((flight) => {
    if (flight.supplier || flight.supplierAccount) {
      uniqueSuppliers.add(flight.supplier || flight.supplierAccount);
    }
  });

  // Add visa suppliers
  visaForms.forEach((visa) => {
    if (visa.supplier) {
      uniqueSuppliers.add(visa.supplier);
    }
  });

  const suppliersList = Array.from(uniqueSuppliers).filter(Boolean);

  // Validate that all suppliers are valid ObjectId strings (24 hex characters)
  const isValidObjectId = (id) => {
    return id && typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  };

  const validSuppliersList = suppliersList.filter(isValidObjectId);

  // Generate transactions for double-entry bookkeeping
  const transactions = [];
  const voucherDate = new Date().toISOString();
  const packageName = data.packageName || packageData?.packageName || "";
  const refNumber = packageData?.refNumber || packageData?.documentNumber || "";

  // 1. Customer transactions (Debit - they owe us)
  if (
    customerAccountId &&
    isValidObjectId(customerAccountId) &&
    totalSellingPrice > 0
  ) {
    // Calculate selling prices by passenger type
    const grossAdultPrice = sellingForeignPrices.adult * adults;
    const grossChildPrice = sellingForeignPrices.child * children;
    const grossInfantPrice = sellingForeignPrices.infant * infants;

    if (adults > 0) {
      transactions.push({
        account: customerAccountId,
        description: `${packageName} - Umrah Package - Adult x${adults}`,
        debit: grossAdultPrice,
        credit: 0,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          groupHead: packageName,
          passengerType: "Adult",
          quantity: adults,
          pricePerPerson: sellingForeignPrices.adult,
          netAmount: grossAdultPrice,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }

    if (children > 0) {
      transactions.push({
        account: customerAccountId,
        description: `${packageName} - Umrah Package - Child x${children}`,
        debit: grossChildPrice,
        credit: 0,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          groupHead: packageName,
          passengerType: "Child",
          quantity: children,
          pricePerPerson: sellingForeignPrices.child,
          netAmount: grossChildPrice,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }

    if (infants > 0) {
      transactions.push({
        account: customerAccountId,
        description: `${packageName} - Umrah Package - Infant x${infants}`,
        debit: grossInfantPrice,
        credit: 0,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          groupHead: packageName,
          passengerType: "Infant",
          quantity: infants,
          pricePerPerson: sellingForeignPrices.infant,
          netAmount: grossInfantPrice,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }
  }

  // 2. Supplier transactions (Credit - we owe them)
  // Hotels
  hotels.forEach((hotel, index) => {
    const hotelSupplier = hotel.supplier || hotel.supplierAccount;
    if (
      hotelSupplier &&
      isValidObjectId(hotelSupplier) &&
      hotel.netBuying > 0
    ) {
      transactions.push({
        account: hotelSupplier,
        description: `Hotel - ${hotel.hotelName} (${hotel.city})`,
        debit: 0,
        credit: hotel.netBuying,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          serviceType: "hotel",
          groupHead: packageName,
          hotelName: hotel.hotelName,
          city: hotel.city,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }
  });

  // Transports
  transports.forEach((transport, index) => {
    const transportSupplier = transport.supplier || transport.supplierAccount;
    if (
      transportSupplier &&
      isValidObjectId(transportSupplier) &&
      transport.netBuying > 0
    ) {
      transactions.push({
        account: transportSupplier,
        description: `Transport - ${transport.transportType} ${transport.route}`,
        debit: 0,
        credit: transport.netBuying,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          serviceType: "transport",
          groupHead: packageName,
          transportType: transport.transportType,
          route: transport.route,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }
  });

  // Flights
  flights.forEach((flight, index) => {
    const flightBuying =
      (flight.buyingPrice || 0) * (flight.buyingExchangeRate || 1);
    const flightSupplier = flight.supplier || flight.supplierAccount;
    if (flightSupplier && isValidObjectId(flightSupplier) && flightBuying > 0) {
      transactions.push({
        account: flightSupplier,
        description: `Ticket - ${flight.airline} ${flight.sector} ${flight.flightno}`,
        debit: 0,
        credit: flightBuying,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          serviceType: "flight",
          groupHead: packageName,
          airline: flight.airline,
          sector: flight.sector,
          flightNo: flight.flightno,
          departureDateTime: flight.departureDateTime,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }
  });

  // Visas
  visaForms.forEach((visa, index) => {
    if (
      visa.supplier &&
      isValidObjectId(visa.supplier) &&
      visa.totalBuying1 > 0
    ) {
      transactions.push({
        account: visa.supplier,
        description: `Visa - ${visa.paxName} ${visa.vtype} ${visa.country}`,
        debit: 0,
        credit: visa.totalBuying1,
        date: voucherDate,
        metadata: {
          packageType: "UmrahHotelVoucher",
          serviceType: "visa",
          groupHead: packageName,
          paxName: visa.paxName,
          country: visa.country,
          visaType: visa.vtype,
          packageId: packageData?._id || data.packageId,
          refNumber: refNumber,
        },
      });
    }
  });

  // Note: Sales income transaction should be added by the main application
  // with a valid income account ID, not by this transform function

  // Return the complete payload for ZIP Accounts voucher API
  return {
    date: voucherDate,
    type: "UmrahHotelVoucher",
    metadata: {
      // Package Type & Reference
      packageType: "Umrah",
      refNumber:
        packageData?.refNumber || packageData?.documentNumber || refNumber,
      packageName: packageName,

      // Package Details
      packageId: packageData?._id || data.packageId || null,
      documentNumber: packageData?.documentNumber || "",
      packageDuration: packageDuration,
      sector: mainFlightInfo.sector || packageData?.sector || "",
      flightNumber:
        mainFlightInfo.flightNumber || packageData?.flightNumber || "",
      availableSeats:
        mainFlightInfo.availableSeats || packageData?.availableSeats || 0,
      packageSource: data.packageSource || "zip-accounts",
      zipPackageId:
        packageData?.zipPackageId || packageData?._id || data.packageId,

      // Room Types & Pricing
      roomTypes: roomTypes,
      totalRooms: totalRooms,
      selectedRoomType: selectedRoomType,
      specialRequests: data.specialRequests || "",

      // Package Status
      publish: packageData?.publish || false,
      featured: packageData?.featured || false,
      isDeleted: packageData?.isDeleted || false,

      // Account Information
      customer: customerAccountId,
      suppliers: validSuppliersList, // Array of valid supplier ObjectId strings
      supplierCount: validSuppliersList.length,
      consultant: null, // To be filled if available

      // Group Information
      groupHead: packageName,
      phone: data.phone || "",
      departureDate: parseDepartureDate,
      arrivalDate: parseArrivalDate,

      // Complete package data for reference
      shirkaData: packageData,

      // Passenger Count & Details
      passengers: {
        adults: adults,
        children: children,
        infants: infants,
        total: totalPassengers,
        passengerList: passengers.map((p) => ({
          name: `${p.givenName || ""} ${p.surName || ""}`.trim(),
          type: p.type,
          title: p.title || "",
          passport: p.passport || "",
          dateOfBirth: p.dateOfBirth || "",
          passportExpiry: p.passportExpiry || "",
          nationality: p.nationality || "",
        })),
      },

      // Buying Prices Breakdown
      buyingPrices: {
        visa: totalVisaBuying,
        hotel: totalHotelBuying,
        ticket: totalFlightBuying,
        transport: totalTransportBuying,
        totalLocalCurrency: totalBuyingPrice,
        systemCurrency: currency,
      },

      // Selling Prices Breakdown
      sellingPrices: {
        foreignPrices: sellingForeignPrices,
        currency: currency,
        exchangeRate: 1,
        totalLocalCurrency: totalSellingPrice,
        systemCurrency: currency,
      },

      // Service Details with arrays
      visaDetails: {
        forms: visaForms,
        totalBuying: totalVisaBuying,
        totalSelling: totalVisaSelling,
        profit: totalVisaSelling - totalVisaBuying,
      },

      hotelDetails: {
        hotels: hotels,
        totalBuying: totalHotelBuying,
        totalSelling: totalHotelSelling,
        profit: totalHotelSelling - totalHotelBuying,
      },

      transportDetails: {
        transports: transports,
        totalBuying: totalTransportBuying,
        totalSelling: totalTransportSelling,
        profit: totalTransportSelling - totalTransportBuying,
      },

      flightDetails: {
        flights: flights,
        totalBuying: totalFlightBuying,
      },

      // Financial Summary
      buyingDiscount: 0,
      sellingDiscount: 0,
      packageAmount: totalSellingPrice,
      packageCost: totalBuyingPrice,
      profit: finalProfit,
    },
    transactions: transactions, // Double-entry bookkeeping transactions
  };
};

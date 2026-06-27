import { useState, useEffect } from "react";
import axiosInstance from "../../api/axios";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import TopBar from "../../components/TopBar/TopBar";
import { FileText } from "lucide-react";

const Ledger = () => {
  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const [filters, setFilters] = useState({
    dateFrom: getCurrentYearStart(),
    dateTo: new Date().toISOString().split("T")[0],
  });

  const [ledgerData, setLedgerData] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate totals
  const calculateTotals = () => {
    const debit = ledgerData.reduce((sum, item) => sum + (item.debit || 0), 0);
    const credit = ledgerData.reduce(
      (sum, item) => sum + (item.credit || 0),
      0,
    );
    const closingBalance = debit - credit;

    return { debit, credit, closingBalance };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const fetchLedger = async () => {
    try {
      setFetching(true);
      setError(null);

      const user = JSON.parse(localStorage.getItem("frontend_user"));
      const userId = user?._id || user?.id;

      if (!userId) {
        setError("User not authenticated. Please login again.");
        setFetching(false);
        return;
      }

      const response = await axiosInstance.get(`/payment/ledger/${userId}`, {
        params: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
      });

      if (response.data.success) {
        // Process entries to add running balance
        let runningBalance = 0;
        const processed = (response.data.data || []).map((entry) => {
          runningBalance += (entry.debit || 0) - (entry.credit || 0);
          return { ...entry, balance: runningBalance };
        });
        setLedgerData(processed);
      }
    } catch (error) {
      console.error("Error fetching ledger:", error);
      setError("Failed to fetch ledger data. Please try again later.");
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: getCurrentYearStart(),
      dateTo: new Date().toISOString().split("T")[0],
    });
    setSearchTerm("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (type) => {
    try {
      const user = JSON.parse(localStorage.getItem("frontend_user"));
      const userId = user?._id || user?.id;
      const userName = user?.name || "User";

      if (type === "copy") {
        const tableData = filteredData
          .map(
            (entry) =>
              `${entry.voucherId || "-"}\t${entry.date ? new Date(entry.date).toLocaleDateString() : "-"}\t${entry.ticketNumber || "-"}\t${entry.description || "-"}\t${entry.debit > 0 ? formatCurrency(entry.debit) : ""}\t${entry.credit > 0 ? formatCurrency(entry.credit) : ""}\t${formatBalance(entry.balance)}`,
          )
          .join("\n");

        const header =
          "Voucher Id\tDate\tTicket #\tDescription\tDebit\tCredit\tBalance\n";
        const totals = `\nTotal\t\t\t\t${formatCurrency(calculateTotals().debit)}\t${formatCurrency(calculateTotals().credit)}\t${formatBalance(calculateTotals().closingBalance)}`;
        const fullText = `Ledger of ${userName.toUpperCase()}\nFrom ${filters.dateFrom} To ${filters.dateTo}\n\n${header}${tableData}${totals}`;

        await navigator.clipboard.writeText(fullText);
        alert("Table data copied to clipboard!");
        return;
      }

      const exportUrl = `/payment/ledger/${userId}/export/${type}`;

      const response = await axiosInstance.get(exportUrl, {
        params: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          userName,
        },
        responseType: "blob",
      });

      if (response.headers["content-type"]?.includes("application/json")) {
        const reader = new FileReader();
        const errorText = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsText(response.data);
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Export failed");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const extension =
        type === "csv" ? "csv" : type === "excel" ? "xlsx" : "pdf";
      link.setAttribute(
        "download",
        `ledger-${userName}-${Date.now()}.${extension}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting as ${type}:`, error);
      alert(
        `Failed to export as ${type.toUpperCase()}. ${error.message || ""}`,
      );
    }
  };

  const filteredData = ledgerData.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.voucherId?.toString().includes(search) ||
      item.ticketNumber?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
    );
  });

  // Format balance as DR / CR
  const formatBalance = (balance) => {
    if (balance === 0) return "0.00";
    return balance > 0
      ? `${formatCurrency(balance)} DR`
      : `${formatCurrency(Math.abs(balance))} CR`;
  };

  const formatStatementDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrintRowDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-GB", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} , ${year}`;
  };

  const user = JSON.parse(localStorage.getItem("frontend_user") || "{}");
  const companyName = user?.companyName || user?.name || "Company";
  const companyAddress = [user?.address, user?.city].filter(Boolean).join(", ");
  const printDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const openingBalance = 0;
  const totals = calculateTotals();

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ledger...</p>
        </div>
      </div>
    );
  }

  if (error && ledgerData.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchLedger}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen mx-auto">
      {/* Print Styles */}
      <style>{`
        .print-only { display: none; }
        .print-header-row { display: none; }
        .print-row { display: none; }
        .print-footer-row { display: none; }
        .screen-footer-row { display: table-row; }
        @media print {
          .screen-footer-row { display: none !important; }
          .print-footer-row { display: table-row !important; }
          @page { !important; size: A4 portrait; margin: 0mm !important; }
          .screen-header-row { display: none !important; }
          .screen-row { display: none !important; }
          .print-header-row { display: table-row !important; }
          .print-row { display: table-row !important; }
          html, body { width: 100% !important; min-height: auto !important; margin: 0 !important; padding: 0 !important; background: transparent !important; background-image: none !important; color: #111827 !important; font-family: Arial, Helvetica, sans-serif !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          nav, aside, header, footer, .no-print { display: none !important; }
          .print-only { display: block !important; width: 100% !important; page-break-inside: avoid !important; }
          .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; background: transparent !important; background-image: none !important; page-break-inside: avoid !important; min-height: auto !important; }
          .min-h-screen { min-height: auto !important; }
          .h-screen { height: auto !important; }
          .bg-white { background: transparent !important; }
          .shadow { box-shadow: none !important; }
          .rounded-lg { border-radius: 0 !important; }
          .print-page-header { display: flex !important; justify-content: space-between !important; align-items: flex-start !important; margin: 10pt 0 14pt !important; page-break-inside: avoid !important; page-break-after: avoid !important; }
          .print-company-section { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 4pt !important; }
          .print-company-logo { width: 70pt !important; min-height: 30pt !important; border: 1px solid #000 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: transparent !important; color: #4b5563 !important; font-size: 7pt !important; padding: 4pt !important; }
          .print-company-logo img { max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; }
          .print-company { color: #111827 !important; font-size: 8pt !important; line-height: 1.35 !important; }
          .print-company-name { font-size: 10pt !important; font-weight: 800 !important; margin-bottom: 2pt !important; }
          .print-company-details { margin-bottom: 1pt !important; color: #4b5563 !important; }
          .print-header-right { text-align: right !important; min-width: 180pt !important; }
          .print-date { font-size: 8pt !important; color: #111827 !important; margin-bottom: 4pt !important; }
          .print-opening { width: 172pt !important; border: 2px solid #000 !important; text-align: center !important; font-size: 8pt !important; color: #111827 !important; background: transparent !important; }
          .print-opening-label { padding: 6pt 5pt !important; border-bottom: 2px solid #000 !important; font-weight: 700 !important; background: transparent !important; }
          .print-opening-value { padding: 8pt 5pt !important; font-weight: 800 !important; }
          .print-separator { border-top: 1px solid #d1d5db !important; margin-bottom: 8pt !important; }
          .print-statement-bar {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;

  background-color: #3da0bd !important;
  color: black !important;

  border: 2px solid #000 !important;
  padding: 8pt 10pt !important;
  margin-bottom: 10pt !important;
  page-break-inside: avoid !important;
}
          .print-statement-title { font-size: 11pt !important; font-weight: 800 !important; color: black !important; }
          .print-statement-range { font-size: 11pt !important; font-weight: 800 !important; text-align: right !important; white-space: nowrap !important; color: black !important; }
          .print-card, .print-card * { color: #000 !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; margin-top: 0 !important; font-size: 7.5pt !important; border: 2px solid #000 !important; page-break-inside: avoid !important; }
          .print-table th, .print-table td { border: 1px solid #000 !important; border-style: solid !important; padding: 5pt 5pt !important; line-height: 1.15 !important; }
          .print-table th { background: #e5e7eb !important; color: #111827 !important; font-weight: 700 !important; }
          .print-col-date { width: 14% !important; }
          .print-col-vno { width: 7% !important; }
          .print-col-details { width: 47% !important; }
          .print-col-small { width: 10% !important; }
          .print-table td { color: #111827 !important; background: transparent !important; }
          .print-table tbody tr:nth-child(odd) td { background: transparent !important; }
          .print-table tfoot td { background: transparent !important; font-weight: 700 !important; }
          .print-table thead th { border-top: 1px solid #000 !important; border-bottom: 1px solid #000 !important; }
          .print-table tfoot td { border-top: 1px solid #000 !important; }
          .print-table thead { display: table-header-group !important; }
          .print-table tfoot { display: table-footer-group !important; }
          .print-table tr { page-break-inside: avoid !important; }
          .print-no-data { font-style: italic !important; color: #6b7280 !important; text-align: center !important; }
          .print-voucher { color: #2563eb !important; font-weight: 700 !important; }
          .print-right { text-align: right !important; }
          .print-closing-note { font-weight: 800 !important; }
          .print-voucher { color: #2563eb !important; font-weight: 700 !important; }
          .print-right { text-align: right !important; }
          .print-closing-note { font-weight: 800 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print">
        <TopBar
          title={"Ledger"}
          icon={<FileText className="text-white w-6 h-6" />}
        />
      </div>

      {/* Print Title - Only visible in print */}
      <div className="print-only">
        <div className="print-container">
          <div className="print-page-header">
            <div className="print-company-section">
              {/* <div className="print-company-logo">
                {user?.logo ? (
                  <img src={user.logo} alt="Company Logo" />
                ) : (
                  <div>Company Logo</div>
                )}
              </div> */}
              <div className="print-company">
                <div className="print-company-name">{companyName}</div>
                {companyAddress && <div className="print-company-details">{companyAddress}</div>}
                {user?.phone && <div className="print-company-details">Phone: {user.phone}</div>}
                {user?.agencyCode && <div className="print-company-details">Agency Code: {user.agencyCode}</div>}
              </div>
            </div>
            <div className="print-header-right">
              <div className="print-date">Print Date: {printDate}</div>
              <div className="print-opening">
                <div className="print-opening-label">Opening Balance</div>
                <div className="print-opening-value">
                  {formatBalance(openingBalance)}
                </div>
              </div>
            </div>
          </div>
          <div className="print-separator"></div>
          <div className="print-statement-bar">
            <div className="print-statement-title">Account Statement of Cash</div>
            <div className="print-statement-range">
              From {formatStatementDate(filters.dateFrom)} To {formatStatementDate(filters.dateTo)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="no-print mb-6 bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Date Range & Export
          </h3>
          <button
            onClick={resetFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium self-start sm:self-auto"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            {/* <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            /> */}
            <MaskedDatePicker
              value={filters.dateFrom}
              onChange={(date) => handleFilterChange("dateFrom", date)}
              placeholderText="From Date"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <MaskedDatePicker
              value={filters.dateTo}
              onChange={(date) => handleFilterChange("dateTo", date)}
              placeholderText="To Date"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2 no-print">
          <button
            onClick={() => handleExport("copy")}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Copy
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="no-print mb-4 bg-white rounded-lg shadow p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by voucher, ticket, or description..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {fetching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200 print-table">
              <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
                <tr className="screen-header-row">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Voucher Id
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Ticket #
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Debit
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Credit
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Balance
                  </th>
                </tr>
                <tr className="print-header-row">
                  <th className="print-col-date px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="print-col-vno px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase tracking-wider whitespace-nowrap">
                    V.no
                  </th>
                  <th className="print-col-details px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Details
                  </th>
                  <th className="print-col-small px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-black uppercase tracking-wider whitespace-nowrap">
                    Debit
                  </th>
                  <th className="print-col-small px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-black uppercase tracking-wider whitespace-nowrap">
                    Credit
                  </th>
                  <th className="print-col-small px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-black uppercase tracking-wider whitespace-nowrap">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-2 sm:px-4 py-6 sm:py-8 print-no-data"
                    >
                      No ledger entries found
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <>
                      <tr
                        key={`screen-${index}`}
                        className="screen-row hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          {item.voucherId || "-"}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {item.date
                            ? new Date(item.date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {item.ticketNumber || "-"}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm leading-tight break-words text-gray-900">
                          {item.description || "-"}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-semibold text-gray-900">
                          {item.debit ? formatCurrency(item.debit) : ""}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-semibold text-gray-900">
                          {item.credit ? formatCurrency(item.credit) : ""}
                        </td>
                        <td
                          className={`px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-semibold ${(item.balance || 0) > 0
                            ? "text-green-600"
                            : (item.balance || 0) < 0
                              ? "text-red-600"
                              : "text-gray-900"
                            }`}
                        >
                          {formatBalance(item.balance || 0)}
                        </td>
                      </tr>
                      <tr key={`print-${index}`} className="print-row">
                        <td className="print-col-date px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[7px] sm:text-[12px] text-gray-900">
                          {formatPrintRowDate(item.date)}
                        </td>
                        <td className="print-col-vno px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[7px] sm:text-[12px] font-medium text-gray-900">
                          {item.voucherId || "-"}
                        </td>
                        <td className="print-col-details px-2 sm:px-4 py-2 sm:py-3 text-[7px] sm:text-[12px] leading-tight break-words text-gray-900">
                          {item.description || "-"}
                        </td>
                        <td className="print-col-small px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[7px] sm:text-[12px] text-right font-semibold text-gray-900">
                          {item.debit ? formatCurrency(item.debit) : ""}
                        </td>
                        <td className="print-col-small px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[7px] sm:text-[12px] text-right font-semibold text-gray-900">
                          {item.credit ? formatCurrency(item.credit) : ""}
                        </td>
                        <td
                          className={`print-col-small px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-semibold ${(item.balance || 0) > 0
                            ? "text-green-600"
                            : (item.balance || 0) < 0
                              ? "text-red-600"
                              : "text-gray-900"
                            }`}
                        >
                          {formatBalance(item.balance || 0)}
                        </td>
                      </tr>
                    </>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="screen-footer-row border-t-2 border-gray-300">
                  <td
                    colSpan="4"
                    className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900"
                  >
                    Total:
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.credit)}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right whitespace-nowrap ${totals.closingBalance > 0
                      ? "text-green-600"
                      : totals.closingBalance < 0
                        ? "text-red-600"
                        : "text-gray-900"
                      }`}
                  >
                    {formatBalance(totals.closingBalance)}
                  </td>
                </tr>
                <tr className="print-footer-row border-t-2 border-gray-300">
                  <td
                    colSpan="5"
                    className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-left text-gray-900"
                  >
                    Closing Balance as on {formatStatementDate(filters.dateTo)}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right whitespace-nowrap ${totals.closingBalance > 0
                      ? "text-green-600"
                      : totals.closingBalance < 0
                        ? "text-red-600"
                        : "text-gray-900"
                      }`}
                  >
                    {formatBalance(totals.closingBalance)}
                  </td>
                </tr>
                <tr className="print-footer-row border-t-2 border-gray-300">
                  <td
                    colSpan="3"
                    className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900"
                  >
                    Total:
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.credit)}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right whitespace-nowrap ${totals.closingBalance > 0
                      ? "text-green-600"
                      : totals.closingBalance < 0
                        ? "text-red-600"
                        : "text-gray-900"
                      }`}
                  >
                    {formatBalance(totals.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* <div className="print-only mt-6">
        <div className="print-special-notes" style={{ fontSize: '8.5pt', fontWeight: 700, marginBottom: '4pt' }}>
          SPECIAL NOTES :
        </div>
        <div className="print-special-notes-text" style={{ fontSize: '8.5pt', color: '#111827' }}>
          {user?.notes || user?.remarks || ""}
        </div>
      </div> */}

      {/* Summary */}
      <div className="no-print mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">
            Total Debit
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {formatCurrency(totals.debit)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">
            Total Credit
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {formatCurrency(totals.credit)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Closing Balance</div>
          <div
            className={`text-2xl font-bold ${totals.closingBalance >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrency(totals.closingBalance)}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="no-print mt-4 text-center text-sm text-gray-600">
        Showing {filteredData.length} of {ledgerData.length} entries
      </div>
    </div>
  );
};

export default Ledger;

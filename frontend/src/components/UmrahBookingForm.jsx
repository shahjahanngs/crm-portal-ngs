import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  User,
  Phone,
  Mail,
  FileText,
  Scan,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { theme } from "../theme/theme";
import { createUmrahBooking } from "../api/umrahBookingApi";
import { parseMRZ } from "../utils/parseMRZ";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

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
    passengers: [
      {
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
      },
    ],
    specialRequests: "",
  });

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = [...formData.passengers];
    updatedPassengers[index][field] = value;
    setFormData({ ...formData, passengers: updatedPassengers });
  };

  const handlePassportUpload = (index, file) => {
    if (file) {
      const updatedPassengers = [...formData.passengers];
      updatedPassengers[index].passportFile = file;
      updatedPassengers[index].passportFileName = file.name;
      setFormData({ ...formData, passengers: updatedPassengers });
    }
  };

  const addPassenger = () => {
    setFormData({
      ...formData,
      passengers: [
        ...formData.passengers,
        {
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
        },
      ],
    });
  };

  const removePassenger = (index) => {
    if (formData.passengers.length > 1) {
      const updatedPassengers = formData.passengers.filter(
        (_, i) => i !== index,
      );
      setFormData({ ...formData, passengers: updatedPassengers });
    }
  };

  const calculateTotalPrice = () => {
    return pricePerPerson * formData.passengers.length;
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

    // Helper function to format Date to YYYY-MM-DD string
    const formatDateForInput = (date) => {
      if (!date) return "";
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
      return "";
    };

    // Helper function to calculate passenger type based on DOB
    const calculatePassengerType = (dob) => {
      if (!dob) return "Adult";

      const birthDate = dob instanceof Date ? dob : new Date(dob);
      const today = new Date();

      // Calculate age in years
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      // Adjust age if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      // Calculate age in months for infants
      const ageInMonths = age * 12 + monthDiff + (dayDiff >= 0 ? 0 : -1);

      if (ageInMonths < 24) {
        return "Infant"; // Under 2 years (0-23 months)
      } else if (age < 12) {
        return "Child"; // 2-11 years
      } else {
        return "Adult"; // 12+ years
      }
    };

    const startIdx = mrzModal.index;
    setFormData((prev) => {
      const newPassengers = [...prev.passengers];
      results.forEach((result, offset) => {
        const idx = startIdx + offset;
        if (idx >= newPassengers.length) return;

        // Calculate passenger type from DOB
        const passengerType = result.dateOfBirth
          ? calculatePassengerType(result.dateOfBirth)
          : newPassengers[idx].type;

        newPassengers[idx] = {
          ...newPassengers[idx],
          type: passengerType,
          surName: result.surName || newPassengers[idx].surName,
          givenName: result.givenName || newPassengers[idx].givenName,
          passport: result.passport || newPassengers[idx].passport,
          nationality: result.nationality || newPassengers[idx].nationality,
          dateOfBirth:
            formatDateForInput(result.dateOfBirth) ||
            newPassengers[idx].dateOfBirth,
          passportExpiry:
            formatDateForInput(result.passportExpiry) ||
            newPassengers[idx].passportExpiry,
          title: result.title || newPassengers[idx].title,
        };
      });
      return { ...prev, passengers: newPassengers };
    });

    const filled = Math.min(
      results.length,
      formData.passengers.length - startIdx,
    );
    toast.success(
      `${filled} passport${filled > 1 ? "s" : ""} scanned successfully!`,
    );
    setMrzModal({ open: false, index: null });
    setMrzInput("");
  };

  const checkPassportExpiry = (expiryDate) => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const today = new Date();
    const sevenMonthsFromNow = new Date();
    sevenMonthsFromNow.setMonth(today.getMonth() + 7);

    if (expiry < today) {
      return { type: "expired", message: "Passport has expired" };
    } else if (expiry <= sevenMonthsFromNow) {
      return {
        type: "warning",
        message:
          "Passport expires within 7 months - may not be eligible for visa",
      };
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create FormData object
      const formDataToSend = new FormData();

      // Add basic booking data
      formDataToSend.append(
        "packageId",
        packageData._id ||
          packageData.id ||
          packageData.voucher_id ||
          "PKG-" + Date.now(),
      );
      formDataToSend.append(
        "packageName",
        packageData.packageName ||
          packageData.title ||
          packageData.name ||
          "Umrah Package",
      );
      formDataToSend.append(
        "packageSource",
        packageData.packageSource || "zip-accounts",
      );
      formDataToSend.append("user", user || "Guest");
      formDataToSend.append("roomType", selectedRoom);
      formDataToSend.append("specialRequests", formData.specialRequests);

      // Add pricing data
      formDataToSend.append("pricing[pricePerPerson]", pricePerPerson);
      formDataToSend.append("pricing[currency]", "PKR");
      formDataToSend.append(
        "pricing[totalAmount]",
        pricePerPerson * formData.passengers.length,
      );

      // Add complete package data as JSON
      formDataToSend.append("packageData", JSON.stringify(packageData));

      // Add passengers data
      formData.passengers.forEach((passenger, index) => {
        formDataToSend.append(`passengers[${index}][type]`, passenger.type);
        formDataToSend.append(`passengers[${index}][title]`, passenger.title);
        formDataToSend.append(
          `passengers[${index}][givenName]`,
          passenger.givenName,
        );
        formDataToSend.append(
          `passengers[${index}][surName]`,
          passenger.surName,
        );
        formDataToSend.append(
          `passengers[${index}][passport]`,
          passenger.passport,
        );
        formDataToSend.append(
          `passengers[${index}][dateOfBirth]`,
          passenger.dateOfBirth,
        );
        formDataToSend.append(
          `passengers[${index}][passportExpiry]`,
          passenger.passportExpiry,
        );
        formDataToSend.append(
          `passengers[${index}][nationality]`,
          passenger.nationality,
        );

        // Add passport file if exists
        if (passenger.passportFile) {
          formDataToSend.append(
            `passportFiles`,
            passenger.passportFile,
            `passenger-${index}-${passenger.passportFile.name}`,
          );
        }
      });

      const response = await createUmrahBooking(formDataToSend);

      if (response.success) {
        toast.success(
          "Booking submitted successfully! Booking Number: " +
            response.data.bookingNumber,
        );
        onClose();
        // Reset form
        setFormData({
          passengers: [
            {
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
            },
          ],
          specialRequests: "",
        });
        setCurrentStep(1);
        setTimeout(() => {
          navigate("/dashboard/umrah-booking");
        }, 1000);
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(
        "Failed to submit booking: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "1600px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "25px 30px",
            background: theme.colors.ublGradient,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              Book Umrah Package
            </h2>
            <p
              style={{ margin: "5px 0 0 0", opacity: 0.9, fontSize: "0.9rem" }}
            >
              {packageData?.packageName ||
                packageData?.title ||
                packageData?.name}{" "}
              - {selectedRoom} Room
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Step Indicator */}
        <div
          style={{
            display: "flex",
            padding: "20px 30px",
            borderBottom: "1px solid #e2e8f0",
            gap: "20px",
          }}
        >
          <StepButton
            number={1}
            label="Passenger Details"
            isActive={currentStep === 1}
            onClick={() => setCurrentStep(1)}
          />
          <StepButton
            number={2}
            label="Review & Submit"
            isActive={currentStep === 2}
            onClick={() => setCurrentStep(2)}
          />
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "30px" }}>
            {/* Step 1: Passenger Details */}
            {currentStep === 1 && (
              <div>
                {formData.passengers.map((passenger, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "25px",
                      padding: "20px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h4
                        style={{ margin: 0, color: "#2d3748", fontWeight: 600 }}
                      >
                        Passenger {index + 1}
                      </h4>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => handleMrzScan(index)}
                          style={{
                            ...addButtonStyle,
                            background: "#3B82F6",
                            padding: "8px 16px",
                            fontSize: "0.85rem",
                          }}
                        >
                          <Scan size={16} /> MRZ Scan
                        </button>
                        {formData.passengers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePassenger(index)}
                            style={deleteButtonStyle}
                          >
                            <Trash2 size={16} /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "0.7fr 0.6fr 1.2fr 1.2fr 1fr 0.9fr 1fr 0.9fr 1.2fr",
                        gap: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <label style={compactLabelStyle}>Type *</label>
                        <select
                          required
                          value={passenger.type}
                          onChange={(e) =>
                            handlePassengerChange(index, "type", e.target.value)
                          }
                          style={compactInputStyle}
                        >
                          <option value="Adult">Adult</option>
                          <option value="Child">Child</option>
                          <option value="Infant">Infant</option>
                        </select>
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Title *</label>
                        <select
                          required
                          value={passenger.title}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "title",
                              e.target.value,
                            )
                          }
                          style={compactInputStyle}
                        >
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Ms">Ms</option>
                          <option value="Miss">Miss</option>
                          <option value="Dr">Dr</option>
                        </select>
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Given Name *</label>
                        <input
                          type="text"
                          required
                          value={passenger.givenName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "givenName",
                              e.target.value,
                            )
                          }
                          style={compactInputStyle}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Surname *</label>
                        <input
                          type="text"
                          required
                          value={passenger.surName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "surName",
                              e.target.value,
                            )
                          }
                          style={compactInputStyle}
                          placeholder="Last name"
                        />
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Passport *</label>
                        <input
                          type="text"
                          required
                          value={passenger.passport}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "passport",
                              e.target.value.toUpperCase(),
                            )
                          }
                          style={compactInputStyle}
                          placeholder="AA1234567"
                        />
                      </div>
                      <div>
                        <label style={compactLabelStyle}>DOB *</label>
                        <input
                          type="date"
                          required
                          value={passenger.dateOfBirth}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "dateOfBirth",
                              e.target.value,
                            )
                          }
                          style={compactInputStyle}
                        />
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Nationality *</label>
                        <input
                          type="text"
                          required
                          value={passenger.nationality}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "nationality",
                              e.target.value,
                            )
                          }
                          style={compactInputStyle}
                          placeholder="Pakistan"
                        />
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Expiry *</label>
                        <input
                          type="date"
                          required
                          value={passenger.passportExpiry}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "passportExpiry",
                              e.target.value,
                            )
                          }
                          style={compactInputStyle}
                        />
                      </div>
                      <div>
                        <label style={compactLabelStyle}>Passport File</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) =>
                            handlePassportUpload(index, e.target.files[0])
                          }
                          style={{ display: "none" }}
                          id={`passport-upload-${index}`}
                        />
                        <label
                          htmlFor={`passport-upload-${index}`}
                          style={{
                            ...compactInputStyle,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            cursor: "pointer",
                            background: passenger.passportFileName
                              ? "#F0FDF4"
                              : "white",
                            border: passenger.passportFileName
                              ? "1px solid #86EFAC"
                              : "1px solid #cbd5e0",
                            color: passenger.passportFileName
                              ? "#166534"
                              : "#718096",
                            fontSize: "0.75rem",
                            padding: "8px 6px",
                          }}
                        >
                          <Upload size={14} />
                          {passenger.passportFileName ? "✓" : "Upload"}
                        </label>
                      </div>
                    </div>
                    {passenger.passportExpiry &&
                      checkPassportExpiry(passenger.passportExpiry) && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "6px",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            background:
                              checkPassportExpiry(passenger.passportExpiry)
                                .type === "expired"
                                ? "#FEE2E2"
                                : "#FEF3C7",
                            border: `1px solid ${
                              checkPassportExpiry(passenger.passportExpiry)
                                .type === "expired"
                                ? "#FCA5A5"
                                : "#FCD34D"
                            }`,
                          }}
                        >
                          <AlertTriangle
                            size={12}
                            color={
                              checkPassportExpiry(passenger.passportExpiry)
                                .type === "expired"
                                ? "#DC2626"
                                : "#D97706"
                            }
                          />
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color:
                                checkPassportExpiry(passenger.passportExpiry)
                                  .type === "expired"
                                  ? "#DC2626"
                                  : "#D97706",
                              fontWeight: 500,
                            }}
                          >
                            {
                              checkPassportExpiry(passenger.passportExpiry)
                                .message
                            }
                          </span>
                        </div>
                      )}
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h3
                    style={{ margin: 0, fontSize: "1.2rem", color: "#2d3748" }}
                  >
                    <FileText
                      size={20}
                      style={{ verticalAlign: "middle", marginRight: "8px" }}
                    />
                    Passenger Details ({formData.passengers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addPassenger}
                    style={addButtonStyle}
                  >
                    <Plus size={16} /> Add Passenger
                  </button>
                </div>
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={primaryButtonStyle}
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Submit */}
            {currentStep === 2 && (
              <div>
                <h3
                  style={{
                    marginBottom: "20px",
                    fontSize: "1.2rem",
                    color: "#2d3748",
                  }}
                >
                  Review Your Booking
                </h3>

                <div style={reviewCardStyle}>
                  <h4 style={reviewHeadingStyle}>Package Details</h4>
                  <div style={reviewRowStyle}>
                    <span>Package:</span>
                    <strong>
                      {packageData?.packageName ||
                        packageData?.title ||
                        packageData?.name}
                    </strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Room Type:</span>
                    <strong style={{ textTransform: "capitalize" }}>
                      {selectedRoom}
                    </strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Price Per Person:</span>
                    <strong>PKR {pricePerPerson?.toLocaleString()}</strong>
                  </div>
                  <div style={reviewRowStyle}>
                    <span>Total Passengers:</span>
                    <strong>{formData.passengers.length}</strong>
                  </div>
                  <div
                    style={{
                      ...reviewRowStyle,
                      borderTop: "2px solid #e2e8f0",
                      paddingTop: "12px",
                      marginTop: "12px",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                      Total Amount:
                    </span>
                    <strong
                      style={{
                        fontSize: "1.3rem",
                        color: theme.colors.success,
                      }}
                    >
                      PKR {calculateTotalPrice().toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div style={reviewCardStyle}>
                  <h4 style={reviewHeadingStyle}>Passengers</h4>
                  {formData.passengers.map((pax, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <strong>
                        {idx + 1}. {pax.title}. {pax.givenName} {pax.surName}
                      </strong>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#718096",
                          marginTop: "5px",
                        }}
                      >
                        {pax.type} | Passport: {pax.passport} | DOB:{" "}
                        {pax.dateOfBirth}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label style={labelStyle}>Special Requests (Optional)</label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialRequests: e.target.value,
                      })
                    }
                    style={{
                      ...inputStyle,
                      minHeight: "80px",
                      resize: "vertical",
                    }}
                    placeholder="Any special requests or notes..."
                  />
                </div>

                <div
                  style={{
                    marginTop: "30px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    style={secondaryButtonStyle}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...primaryButtonStyle,
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

      {/* MRZ Scan Modal */}
      {mrzModal.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={() => setMrzModal({ open: false, index: null })}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 25px",
                background: theme.colors.ublGradient,
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "8px",
                    borderRadius: "10px",
                  }}
                >
                  <Scan size={20} />
                </div>
                <div>
                  <h4
                    style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}
                  >
                    Passport MRZ Scanner
                  </h4>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: "0.85rem" }}>
                    Passenger {(mrzModal.index || 0) + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMrzModal({ open: false, index: null })}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "25px" }}>
              {/* Instructions */}
              <div
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "10px",
                  padding: "12px 15px",
                  marginBottom: "20px",
                  display: "flex",
                  gap: "12px",
                }}
              >
                <div style={{ color: "#2563EB", marginTop: "2px" }}>
                  <AlertTriangle size={16} />
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#1E40AF",
                    lineHeight: 1.5,
                  }}
                >
                  💡 The MRZ is the two lines of machine-readable text at the
                  bottom of the passport page. Paste each passenger's MRZ
                  (separated by blank lines) to auto-fill multiple passengers.
                </div>
              </div>

              {/* Textarea */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
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
                  placeholder={`P<PAKNAME<<GIVEN<NAME<<<<<<<<<<<<<<<<<<<<<\nAB1234567PAK8501011M2601014<<<<<<<<<<<<<<<6\n\nP<PAKSECOND<<PASSENGER<<<<<<<<<<<<<<<<<<<<\nCD9876543PAK9001011F2801014<<<<<<<<<<<<<<8`}
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    resize: "vertical",
                    outline: "none",
                    background: "#F9FAFB",
                  }}
                />
                {mrzError && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "10px 12px",
                      background: "#FEE2E2",
                      border: "1px solid #FCA5A5",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertTriangle size={14} color="#DC2626" />
                    <span style={{ fontSize: "0.85rem", color: "#DC2626" }}>
                      {mrzError}
                    </span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMrzModal({ open: false, index: null })}
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    color: "#4B5563",
                    border: "2px solid #E5E7EB",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMrzParse}
                  style={{
                    padding: "10px 24px",
                    background: theme.colors.ublGradient,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Scan size={16} />
                  Parse MRZ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const StepButton = ({ number, label, isActive, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      opacity: isActive ? 1 : 0.5,
    }}
  >
    <div
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: isActive ? theme.colors.ublGradient : "#cbd5e0",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
      }}
    >
      {number}
    </div>
    <span
      style={{
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "#2d3748" : "#718096",
      }}
    >
      {label}
    </span>
  </div>
);

// Styles
const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#4a5568",
};

const compactLabelStyle = {
  display: "block",
  marginBottom: "4px",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#4a5568",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e0",
  borderRadius: "8px",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const compactInputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e0",
  borderRadius: "6px",
  fontSize: "0.82rem",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "12px 30px",
  background: theme.colors.ublGradient,
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const secondaryButtonStyle = {
  padding: "12px 30px",
  background: "white",
  color: "#2d3748",
  border: "2px solid #e2e8f0",
  borderRadius: "10px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const addButtonStyle = {
  padding: "10px 20px",
  background: "#48bb78",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "0.9rem",
};

const deleteButtonStyle = {
  padding: "8px 16px",
  background: "#f56565",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "0.85rem",
};

const reviewCardStyle = {
  padding: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  marginBottom: "20px",
  background: "#fff",
};

const reviewHeadingStyle = {
  margin: "0 0 15px 0",
  fontSize: "1rem",
  fontWeight: 700,
  color: "#2d3748",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "10px",
};

const reviewRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  fontSize: "0.9rem",
  color: "#4a5568",
};

export default UmrahBookingForm;

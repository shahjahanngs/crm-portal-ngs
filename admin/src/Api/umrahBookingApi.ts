import axiosInstance from "./axios";

// Get all Umrah bookings (Admin only)
export const getAllBookingsAdmin = async (params = {}) => {
  try {
    // Add timestamp to prevent caching
    const response = await axiosInstance.get("/umrah-bookings/admin/all", {
      params: {
        ...params,
        _t: Date.now(), // Cache buster
      },
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching all bookings (admin):", error);
    throw error;
  }
};

// Get Umrah booking by ID
export const getUmrahBookingById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/umrah-bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Umrah booking:", error);
    throw error;
  }
};

// Review payment status (Admin only)
export const reviewPayment = async (
  paymentId: string,
  data: FormData | object,
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/payment/${paymentId}/review`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error reviewing payment:", error);
    throw error;
  }
};

// Update payment status with optional file upload (DEPRECATED - use reviewPayment instead)
export const updatePaymentStatus = async (
  id: string,
  data: FormData | object,
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/payment-status`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

// Update visa status with optional file upload
export const updateVisaStatus = async (id: string, data: FormData | object) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/visa-status`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating visa status:", error);
    throw error;
  }
};

// Update hotel status with optional file upload
export const updateHotelStatus = async (
  id: string,
  data: FormData | object,
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/hotel-status`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating hotel status:", error);
    throw error;
  }
};

// Update voucher status
export const updateVoucherStatus = async (id: string, data: object) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/voucher-status`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating voucher status:", error);
    throw error;
  }
};

// Update overall status
export const updateOverallStatus = async (id: string, data: object) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/overall-status`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating overall status:", error);
    throw error;
  }
};

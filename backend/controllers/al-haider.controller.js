import axios from "axios";

const getAlHaiderToken = () => {
    const token = process.env.ALI_HAIDER_API_TOKEN?.trim();
    if (!token) throw new Error("Al-Haider API token is not configured");
    return token;
};

export const fetchNormalisedAlHaiderGroups = async () => [];

export const getAvailableBookingsByGroup = async (req, res) => {
    res.status(200).json({ success: true, data: [] });
};

export const getAirlines = async (req, res) => {
    res.status(200).json({ success: true, data: [] });
};

export const createAlHaiderBooking = async (_bookingData) => {
    throw new Error("Al-Haider API integration is disabled");
};
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { theme } from "../../theme/theme";

interface Offer {
    _id: string;
    title: string;
    image: string;
}

export default function SpecialOffer() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get("/specialOffer/getSpecialOffers");
            if (response.data.success) {
                setOffers(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch offers", error);
        } finally {
            setLoading(false);
        }
    };

    if (!loading && offers.length === 0) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setPreviewImage(null);
            setIsClosing(false);
        }, 200);
    };

    return (
        <div
            style={{ backgroundColor: theme.colors.background }}
            className="mb-10 p-5"
        >
            <div className="max-w-7xl mx-auto">
                {/* Heading Section */}
                <div className='relative w-fit mb-12 text-center mx-auto group'>
                    <h2
                        style={{ color: theme.colors.textPrimary }}
                        className='relative text-3xl sm:text-4xl z-10 font-bold tracking-tight'
                    >
                        Special Offers
                    </h2>
                    <div
                        style={{ background: theme.colors.ublGradient, height: '35%' }}
                        className='absolute bottom-1 left-0 w-full opacity-20 rounded-md z-0 transition-all group-hover:opacity-30'
                    ></div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        [1, 2, 3].map((n) => (
                            <div
                                key={n}
                                style={{ borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.card }}
                                className="p-3 animate-pulse border border-gray-100"
                            >
                                <div className="aspect-4/3 bg-gray-200 rounded-md" />
                                <div className="h-6 w-3/4 mt-4 bg-gray-100 rounded" />
                            </div>
                        ))
                    ) : (
                        offers.map((offer) => (
                            <div
                                key={offer._id}
                                style={{
                                    borderRadius: theme.borderRadius.lg,
                                    backgroundColor: theme.colors.card,
                                    boxShadow: theme.shadows.md,
                                    transition: theme.transitions.smooth
                                }}
                                className="group p-3 border border-transparent hover:border-teal-500/20 hover:shadow-xl"
                            >
                                <div
                                    style={{ borderRadius: theme.borderRadius.md }}
                                    className="relative aspect-4/3 overflow-hidden cursor-zoom-in bg-gray-50"
                                    onClick={() => setPreviewImage(offer.image)}
                                >
                                    <img
                                        src={offer.image}
                                        alt={offer.title}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                                    />
                                    {/* Professional Gradient Overlay */}
                                    <div
                                        style={{ background: `linear-gradient(to top, ${theme.colors.ublGradientStart}99, transparent)` }}
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                                    >
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 pb-1 px-1 flex justify-between items-center">
                                    <h3
                                        style={{ color: theme.colors.textSecondary }}
                                        className="text-base font-semibold truncate mr-2"
                                    >
                                        {offer.title}
                                    </h3>
                                    <button
                                        onClick={() => setPreviewImage(offer.image)}
                                        style={{ color: theme.colors.accent, transition: theme.transitions.fast }}
                                        className="text-xs font-bold whitespace-nowrap hover:opacity-80 tracking-wider"
                                    >
                                        VIEW DETAIL
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Lightbox Modal */}
            {previewImage && (
                <div
                    className={`fixed inset-0 z-1000 flex items-center justify-center bg-slate-900/90 backdrop-blur-md transition-opacity duration-300 p-4 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={handleClose}
                >
                    <div
                        className={`relative flex flex-col items-center justify-center transition-all duration-300 transform ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"} ease-out max-w-5xl w-full`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{ borderRadius: theme.borderRadius.xl, boxShadow: theme.shadows.xl }}
                            className="max-w-full max-h-[75vh] object-contain border border-white/10"
                        />

                        {/* Professional Toolbar */}
                        <div
                            style={{
                                background: theme.colors.sidebarBg,
                                borderRadius: theme.borderRadius.full,
                                boxShadow: theme.shadows.lg
                            }}
                            className="mt-8 flex items-center gap-6 px-8 py-3 text-white border border-white/10"
                        >
                            <button
                                onClick={() => window.open(previewImage)}
                                style={{ color: theme.colors.sidebarTextLight }}
                                className="hover:text-teal-400 transition-colors text-sm font-bold tracking-wide flex items-center gap-2"
                            >
                                <span>DOWNLOAD</span>
                            </button>
                            <span className="w-px h-4 bg-gray-700"></span>
                            <button
                                onClick={handleClose}
                                style={{ color: theme.colors.danger }}
                                className="hover:brightness-125 transition-colors text-sm font-bold tracking-wide"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                body:has([data-modal-open="true"]) {
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}
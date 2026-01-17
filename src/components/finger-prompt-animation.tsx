"use client";

const FingerPromptAnimation = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="relative w-24 h-24">
                {/* Fingerprint Icon as a placeholder for a finger */}
                <div className="w-full h-full animate-finger-tap">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-full h-full text-white"
                        style={{ filter: "drop-shadow(0 4px 6px rgba(255, 255, 255, 0.2))" }}
                    >
                        <path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" />
                        <path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" />
                        <path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" />
                        <path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3" />
                        <path d="M3.5 12.5a2.5 2.5 0 0 1 3-1.5" />
                        <path d="M14.5 5.5a1.5 1.5 0 0 1 3 0" />
                    </svg>
                </div>
                
                {/* Ripple Effect */}
                <div
                    className="absolute top-0 left-0 w-full h-full scale-0 rounded-full animate-ripple"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)",
                    }}
                ></div>
            </div>
        </div>
    );
};

export default FingerPromptAnimation;

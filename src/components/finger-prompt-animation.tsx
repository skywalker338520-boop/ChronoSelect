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
                        <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                        <path d="M5 19.5A8.5 8.5 0 0 1 12 11a8.5 8.5 0 0 1 7 8.5" />
                        <path d="M12 11v.01" />
                        <path d="M7 16v.01" />
                        <path d="M10 19v.01" />
                        <path d="M14 19v.01" />
                        <path d="M17 16v.01" />
                        <path d="M10 13v.01" />
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

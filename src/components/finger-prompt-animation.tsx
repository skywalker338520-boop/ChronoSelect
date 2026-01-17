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
                        <path d="M12 11.83v8.17" />
                        <path d="M9.9 9.73a2.5 2.5 0 0 1 4.2 0" />
                        <path d="M11.05 15.34a2 2 0 0 1 1.9 0" />
                        <path d="M14.6 11.2a2 2 0 0 1 2.9 0" />
                        <path d="M7.4 11.2a2 2 0 0 1 2.9 0" />
                        <path d="M17.5 14.3a2 2 0 0 1 2.9 0" />
                        <path d="M4.5 14.3a2 2 0 0 1 2.9 0" />
                        <path d="M13.5 6.4a2 2 0 0 1 1.1 3.4" />
                        <path d="M10.5 6.4a2 2 0 0 0-1.1 3.4" />
                        <path d="M12 3a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1z" />
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
            <p className="mt-4 text-2xl font-headline text-primary">
                Touch the Screen
            </p>
        </div>
    );
};

export default FingerPromptAnimation;

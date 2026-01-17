"use client";

const FingerPromptAnimation = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="relative w-24 h-24">
                {/* The ripple effect will play, suggesting a touch point */}
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

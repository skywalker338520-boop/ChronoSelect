"use client";

const FingerPromptAnimation = () => {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
            <svg
                className="w-24 h-24 text-white"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    animation: 'tap 1.5s infinite ease-in-out',
                }}
            >
                <path
                    d="M15 14h.01M11 14h.01M7 14h.01M11 10h.01M7 10h.01M21 12a9 9 0 1 1-9-9c2.5.4 4.5 1.4 5.9 2.8M18.8 9.3a4.5 4.5 0 1 0 15 15.6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
};

export default FingerPromptAnimation;

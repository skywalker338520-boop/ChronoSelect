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
                    d="M12 13V9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M16 17a4 4 0 1 1-8 0a4 4 0 0 1 8 0z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle cx="12" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        </div>
    );
};

export default FingerPromptAnimation;

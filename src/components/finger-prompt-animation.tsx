"use client";

const FingerPromptAnimation = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center pointer-events-none animate-finger-tap">
            <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M9 7.04211C9 5.91789 9.89543 5 11 5H13C14.1046 5 15 5.91789 15 7.04211V13.7601C15 14.8843 14.1046 15.8022 13 15.8022H11C9.89543 15.8022 9 14.8843 9 13.7601V7.04211Z" />
                <path d="M12 15.8022V19" />
            </svg>
        </div>
    );
};

export default FingerPromptAnimation;

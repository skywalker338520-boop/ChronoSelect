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
                xmlns="http://www.w3.org/2000/svg"
                className="transform rotate-180"
            >
                <path d="M13.5 16V5.32789C13.5 4.59549 12.9045 4 12.1721 4C11.4397 4 10.8442 4.59549 10.8442 5.32789V14.5H9C7.89543 14.5 7 15.3954 7 16.5V20C7 21.1046 7.89543 22 9 22H15C16.1046 22 17 21.1046 17 20V17.5C17 16.6716 16.3284 16 15.5 16H13.5Z" />
            </svg>
        </div>
    );
};

export default FingerPromptAnimation;

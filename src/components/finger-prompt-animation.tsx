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
                    d="M14 20.8654C16.206 20.4579 18.5352 18.6325 18.5352 16.1554C18.5352 13.6782 16.206 11.8528 14 11.4453M14 20.8654V11.4453M14 20.8654H8.46481C6.25883 20.8654 4.5 19.0335 4.5 16.8213C4.5 14.6091 6.25883 12.7772 8.46481 12.7772H14M8.19672 12.7772L10.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle
                    cx="10.5"
                    cy="3"
                    r="1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </svg>
        </div>
    );
};

export default FingerPromptAnimation;

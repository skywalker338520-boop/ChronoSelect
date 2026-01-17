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
                    d="M12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M12.2192 11.5203L15.4292 21.5003H19.2992C20.1292 21.5003 20.8492 20.9303 21.0892 20.1403L22.0892 16.7903C22.4592 15.5403 21.5392 14.2803 20.2892 14.1603C19.7992 14.1103 19.3192 14.2603 18.9492 14.5703L17.4292 15.8403C16.9692 16.2103 16.2592 16.1503 15.8692 15.6803L14.9292 14.5003C14.4592 13.9203 13.5892 13.9203 13.1192 14.5003L12.4292 15.3403C11.9592 15.9203 11.0892 15.9203 10.6192 15.3403L8.86918 13.2403C8.39918 12.6603 7.52918 12.6603 7.05918 13.2403L5.05918 15.6803C4.58918 16.2603 4.80918 17.1503 5.51918 17.4303L6.86918 17.9503"
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

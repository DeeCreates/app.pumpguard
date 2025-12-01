import React from "react";

interface LoaderScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

const LoaderScreen: React.FC<LoaderScreenProps> = ({
  message = "Loading PumpGuard...",
  subMessage = "Please wait while we set things up",
  fullScreen = true,
}) => {
  return (
    <div
      className={`${
        fullScreen ? "min-h-screen" : "h-full"
      } flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100`}
    >
      <div className="flex flex-col items-center space-y-6">
        {/* PumpGuard Logo with Pulsing Animation */}
        <div className="relative">
          {/* Outer Ring Animation */}
          <div className="absolute -inset-4">
            <div className="w-full h-full rounded-full border-4 border-blue-200 animate-ping opacity-75" />
          </div>
          
          {/* Main Logo Container */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10 text-white"
            >
              {/* Fuel Pump Icon */}
              <path d="M12 2v20M9 22h6" />
              <path d="M9 6h6v4H9z" />
              <path d="M17 7V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3" />
              <circle cx="12" cy="10" r="2" />
            </svg>
            
            {/* Spinning Ring */}
            <div className="absolute -inset-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
          
          {/* Small Dots Animation */}
          <div className="absolute -top-2 -right-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <div className="absolute -bottom-2 -left-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2">
          <div className="relative">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              PumpGuard
            </h1>
            {/* Text Loading Animation */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <p className="text-gray-700 font-medium">{message}</p>
            <p className="text-gray-500 text-sm">{subMessage}</p>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-1 pt-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoaderScreen;
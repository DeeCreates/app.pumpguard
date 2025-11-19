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
      <div className="flex flex-col items-center space-y-4">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-gray-700 font-medium text-base">{message}</p>
          <p className="text-gray-500 text-sm">{subMessage}</p>
        </div>
      </div>
    </div>
  );
};

export default LoaderScreen;

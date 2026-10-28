"use client";

import { useState } from "react";
import { usePWA } from "./PWAManager";
import { 
  FiDownload, 
  FiCheck, 
  FiInfo, 
  FiSmartphone, 
  FiAlertCircle 
} from "react-icons/fi";
import { toast } from "react-hot-toast";

interface PWAInstallButtonProps {
  variant?: "primary" | "secondary" | "outline" | "text";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
  showTooltip?: boolean;
}

export default function PWAInstallButton({
  variant = "primary",
  size = "md",
  className = "",
  showLabel = true,
  showTooltip = true,
}: PWAInstallButtonProps) {
  const { isPWA, isInstallable, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Handle installation
  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
      toast.success("Installation started!");
    } catch (error) {
      console.error("Installation error:", error);
      toast.error("Installation failed. Please try again.");
    } finally {
      setIsInstalling(false);
    }
  };

  // Base styles for different variants
  const variantStyles = {
    primary: "bg-primary-500 hover:bg-primary-600 text-white",
    secondary: "bg-secondary-500 hover:bg-secondary-600 text-white",
    outline: "bg-transparent border border-primary-500 text-primary-500 hover:bg-primary-50",
    text: "bg-transparent text-primary-500 hover:underline p-0",
  };

  // Base styles for different sizes
  const sizeStyles = {
    sm: "text-xs py-1 px-2",
    md: "text-sm py-2 px-3",
    lg: "text-base py-3 px-4",
  };

  // If already installed as PWA
  if (isPWA) {
    return (
      <div className={`flex items-center ${className}`}>
        <FiCheck className="text-success-500 mr-1" />
        {showLabel && <span className="text-success-500 text-sm">App Installed</span>}
      </div>
    );
  }

  // If installable
  if (isInstallable) {
    return (
      <div className="relative">
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className={`
            ${variantStyles[variant]} 
            ${sizeStyles[size]}
            ${className}
            rounded-md flex items-center justify-center transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          onFocus={() => setShowInfo(true)}
          onBlur={() => setShowInfo(false)}
        >
          {isInstalling ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {showLabel && <span>Installing...</span>}
            </div>
          ) : (
            <div className="flex items-center">
              <FiDownload className={showLabel ? "mr-2" : ""} />
              {showLabel && <span>Install App</span>}
            </div>
          )}
        </button>
        
        {/* Tooltip */}
        {showTooltip && showInfo && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white text-xs rounded py-1 px-2 w-48 z-10">
            <div className="flex items-start">
              <FiSmartphone className="mt-0.5 mr-1 flex-shrink-0" />
              <span>Install CareLink AI on your device for a better experience with offline access</span>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
              <div className="border-solid border-t-neutral-800 border-t-8 border-x-transparent border-x-8 border-b-0"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If not installable (browser doesn't support PWA or already prompted)
  return null;
}

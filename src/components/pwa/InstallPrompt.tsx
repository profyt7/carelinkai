"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiDownload, 
  FiX, 
  FiPlus, 
  FiShare, 
  FiChevronRight, 
  FiCheckCircle, 
  FiSmartphone,
  FiClock,
  FiWifi,
  FiSettings
} from "react-icons/fi";
import Image from "next/image";
import { usePWA } from "./PWAManager";

// Types for component props
export type InstallPromptVariant = "banner" | "modal" | "card" | "inline";

interface InstallPromptProps {
  variant?: InstallPromptVariant;
  position?: "top" | "bottom" | "inline";
  showDismiss?: boolean;
  persistDismissal?: boolean;
  dismissDays?: number;
  className?: string;
  showAfterMs?: number;
}

// Main component
export default function InstallPrompt({
  variant = "banner",
  position = "bottom",
  showDismiss = true,
  persistDismissal = true,
  dismissDays = 7,
  className = "",
  showAfterMs = 3000,
}: InstallPromptProps) {
  // Get PWA context
  const { isInstallable, isPWA, installApp } = usePWA();
  
  // Component state
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Check if the prompt should be shown based on user preferences
  useEffect(() => {
    const checkDismissalStatus = () => {
      if (persistDismissal) {
        const dismissedUntil = localStorage.getItem("pwaPromptDismissedUntil");
        if (dismissedUntil) {
          const dismissedDate = new Date(dismissedUntil);
          if (dismissedDate > new Date()) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Detect iOS devices
    const detectIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    // Show prompt after delay if conditions are met
    const timer = setTimeout(() => {
      if (isInstallable && !isPWA && checkDismissalStatus()) {
        setIsVisible(true);
      }
      
      setIsIOSDevice(detectIOSDevice());
    }, showAfterMs);
    
    return () => clearTimeout(timer);
  }, [isInstallable, isPWA, persistDismissal, showAfterMs]);
  
  // Handle dismissal
  const handleDismiss = () => {
    setIsVisible(false);
    
    if (persistDismissal) {
      const dismissDate = new Date();
      dismissDate.setDate(dismissDate.getDate() + dismissDays);
      localStorage.setItem("pwaPromptDismissedUntil", dismissDate.toISOString());
    }
  };
  
  // Handle install click
  const handleInstallClick = () => {
    if (isIOSDevice) {
      setShowIOSInstructions(true);
    } else {
      installApp();
    }
  };
  
  // Features list for highlighting PWA benefits
  const features = [
    {
      icon: <FiWifi className="text-primary-500" size={20} />,
      title: "Works Offline",
      description: "Access key features even without internet"
    },
    {
      icon: <FiSmartphone className="text-primary-500" size={20} />,
      title: "App-like Experience",
      description: "Feels like a native app on your device"
    },
    {
      icon: <FiClock className="text-primary-500" size={20} />,
      title: "Faster Access",
      description: "Quick launch without opening browser"
    },
    {
      icon: <FiSettings className="text-primary-500" size={20} />,
      title: "Enhanced Features",
      description: "Notifications and better performance"
    }
  ];
  
  // iOS installation steps
  const iosSteps = [
    {
      title: "Tap the Share button",
      description: "Look for the Share icon in Safari's toolbar",
      icon: <FiShare size={24} />
    },
    {
      title: "Find 'Add to Home Screen'",
      description: "Scroll down in the share menu if needed",
      icon: <FiPlus size={24} />
    },
    {
      title: "Tap 'Add' to confirm",
      description: "The app will appear on your home screen",
      icon: <FiCheckCircle size={24} />
    }
  ];
  
  // Don't render if not needed
  if (!isVisible || isPWA) {
    return null;
  }
  
  // Render iOS instructions modal
  if (showIOSInstructions) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-neutral-800">Install on iOS</h2>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                  aria-label="Close instructions"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="flex justify-center my-4">
                <div className="relative w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">C</span>
                </div>
              </div>
              
              <p className="text-neutral-600 mb-6 text-center">
                Follow these steps to install CareLink AI on your iOS device:
              </p>
              
              <div className="space-y-6 mb-6">
                {iosSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: currentStep >= index + 1 ? 1 : 0.5,
                      y: 0 
                    }}
                    transition={{ delay: index * 0.2 }}
                    className={`flex items-start p-4 rounded-lg ${
                      currentStep === index + 1 ? "bg-primary-50 border border-primary-100" : ""
                    }`}
                    onClick={() => setCurrentStep(index + 1)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      currentStep === index + 1 ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500"
                    }`}>
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-800">{step.title}</h3>
                      <p className="text-sm text-neutral-600">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <div className="relative w-full max-w-[280px] h-[200px]">
                  <Image
                    src={`/images/ios-install-step-${currentStep}.png`}
                    alt={`iOS installation step ${currentStep}`}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                  disabled={currentStep === 1}
                  className={`px-4 py-2 rounded-md ${
                    currentStep === 1 
                      ? "bg-neutral-100 text-neutral-400" 
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  Previous
                </button>
                
                <button
                  onClick={() => {
                    if (currentStep < 3) {
                      setCurrentStep(prev => prev + 1);
                    } else {
                      setShowIOSInstructions(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  {currentStep < 3 ? "Next" : "Got it"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }
  
  // Render different variants
  switch (variant) {
    case "modal":
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="h-40 bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                  <div className="relative w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <span className="text-primary-500 font-bold text-3xl">C</span>
                  </div>
                </div>
                
                {showDismiss && (
                  <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors"
                    aria-label="Dismiss"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-semibold text-neutral-800 mb-2">
                  Install CareLink AI
                </h2>
                
                <p className="text-neutral-600 mb-4">
                  Add our app to your home screen for a faster, app-like experience with offline capabilities.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center mb-2">
                        {feature.icon}
                        <h3 className="ml-2 font-medium text-sm">{feature.title}</h3>
                      </div>
                      <p className="text-xs text-neutral-500">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3">
                  {showDismiss && (
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
                    >
                      Not now
                    </button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstallClick}
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 flex items-center"
                  >
                    <FiDownload className="mr-2" />
                    Install App
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      );
      
    case "card":
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}
        >
          <div className="p-5">
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-lg bg-primary-500 flex items-center justify-center mr-4">
                <FiDownload className="text-white" size={24} />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-800 mb-1">Install CareLink AI</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Add to home screen for the best experience
                </p>
                
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstallClick}
                    className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 flex items-center"
                  >
                    Install Now
                  </motion.button>
                  
                  {showDismiss && (
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
                    >
                      Later
                    </button>
                  )}
                </div>
              </div>
              
              {showDismiss && (
                <button
                  onClick={handleDismiss}
                  className="p-1 text-neutral-400 hover:text-neutral-600"
                  aria-label="Dismiss"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      );
      
    case "inline":
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`bg-primary-50 border border-primary-100 rounded-lg p-4 ${className}`}
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <FiSmartphone className="text-primary-600" size={20} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-neutral-800 text-sm">Install CareLink AI</h3>
              <p className="text-xs text-neutral-600">
                Get offline access and app-like experience
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInstallClick}
              className="ml-4 px-3 py-1.5 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 flex items-center whitespace-nowrap"
            >
              <FiDownload className="mr-1" size={14} />
              Install
            </motion.button>
            
            {showDismiss && (
              <button
                onClick={handleDismiss}
                className="ml-2 p-1.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100"
                aria-label="Dismiss"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </motion.div>
      );
      
    // Default banner variant
    default:
      return (
        <motion.div
          initial={{ 
            opacity: 0, 
            y: position === "top" ? -100 : 100 
          }}
          animate={{ 
            opacity: 1, 
            y: 0 
          }}
          exit={{ 
            opacity: 0, 
            y: position === "top" ? -100 : 100 
          }}
          className={`fixed ${
            position === "top" ? "top-0" : "bottom-0"
          } left-0 right-0 bg-white shadow-lg border-t border-neutral-200 z-50 safe-bottom ${className}`}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center">
              <div className="hidden sm:block w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center mr-4">
                <FiDownload className="text-white" size={20} />
              </div>
              
              <div className="flex-1 mr-4">
                <h3 className="font-medium text-neutral-800">Install CareLink AI</h3>
                <p className="text-sm text-neutral-500">
                  {isIOSDevice 
                    ? "Add to your home screen for the best experience" 
                    : "Install our app for offline access and faster performance"}
                </p>
              </div>
              
              <div className="flex items-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 flex items-center whitespace-nowrap"
                >
                  <FiDownload className="mr-2" />
                  Install App
                </motion.button>
                
                {showDismiss && (
                  <button
                    onClick={handleDismiss}
                    className="ml-3 p-2 text-neutral-400 hover:text-neutral-600"
                    aria-label="Dismiss"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
  }
}

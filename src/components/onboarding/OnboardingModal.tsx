'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiX, FiCheck, FiArrowRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'carelinkai_onboarding_completed';

type OnboardingStep = {
  title: string;
  description: string;
  action?: string;
  actionLink?: string;
};

const onboardingSteps: Record<string, OnboardingStep[]> = {
  FAMILY: [
    {
      title: "Welcome to CareLinkAI!",
      description: "Let's help you find the perfect care home for your loved one.",
    },
    {
      title: "AI-Powered Search",
      description: "Use natural language to describe your needs, and our AI will find matching homes.",
      action: "Try Search",
      actionLink: "/search",
    },
    {
      title: "Book Tours & Track Inquiries",
      description: "Easily schedule tours and manage all your inquiries in one place.",
      action: "View Inquiries",
      actionLink: "/family",
    },
    {
      title: "Get Matched with Caregivers",
      description: "Find qualified caregivers who match your specific requirements.",
      action: "Browse Caregivers",
      actionLink: "/family/caregivers",
    },
  ],
  OPERATOR: [
    {
      title: "Welcome, Facility Operator!",
      description: "Let's set up your facility profile to start receiving inquiries.",
    },
    {
      title: "Complete Your Profile",
      description: "Add details about your facility, amenities, and available services.",
      action: "Edit Profile",
      actionLink: "/operator/homes",
    },
    {
      title: "Add Photos & Amenities",
      description: "Showcase your facility with high-quality photos and detailed amenity lists.",
      action: "Manage Listings",
      actionLink: "/operator/homes",
    },
    {
      title: "Start Receiving Inquiries",
      description: "Once your profile is complete, families can find and contact you.",
      action: "View Inquiries",
      actionLink: "/operator",
    },
  ],
  DISCHARGE_PLANNER: [
    {
      title: "Welcome to Your AI Assistant!",
      description: "Streamline your placement process with intelligent matching.",
    },
    {
      title: "Natural Language Search",
      description: "Simply describe your patient's needs in plain language.",
      action: "Try AI Search",
      actionLink: "/discharge-planner/search",
    },
    {
      title: "Send Requests Instantly",
      description: "Email multiple facilities at once with patient requirements.",
      action: "Start Searching",
      actionLink: "/discharge-planner/search",
    },
    {
      title: "Track All Placements",
      description: "Monitor responses and manage all placements in your dashboard.",
      action: "View Dashboard",
      actionLink: "/discharge-planner",
    },
  ],
  CAREGIVER: [
    {
      title: "Welcome, Caregiver!",
      description: "Let's create your professional profile to connect with families.",
    },
    {
      title: "Build Your Profile",
      description: "Showcase your experience, certifications, and specializations.",
      action: "Edit Profile",
      actionLink: "/caregiver/profile",
    },
    {
      title: "Set Your Availability",
      description: "Let families know when you're available and your preferred schedule.",
      action: "Update Availability",
      actionLink: "/caregiver/profile",
    },
    {
      title: "Start Receiving Offers",
      description: "Families will be able to find and connect with you for opportunities.",
      action: "View Dashboard",
      actionLink: "/caregiver",
    },
  ],
};

export default function OnboardingModal() {
  const { data: session } = useSession() || {};
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isClient, setIsClient] = useState(false);

  const userRole = session?.user?.role || 'FAMILY';
  const steps = onboardingSteps[userRole] || onboardingSteps.FAMILY;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !session?.user) return;

    // Check if onboarding has been completed
    const completed = localStorage.getItem(`${ONBOARDING_KEY}_${userRole}`);
    if (!completed) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isClient, session, userRole]);

  const handleClose = () => {
    localStorage.setItem(`${ONBOARDING_KEY}_${userRole}`, 'true');
    setShowOnboarding(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleAction = () => {
    handleClose();
    if (steps[currentStep]?.actionLink) {
      window.location.href = steps[currentStep].actionLink!;
    }
  };

  if (!isClient) return null;

  return (
    <AnimatePresence>
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] px-8 py-6 relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white hover:text-neutral-200 transition-colors"
              >
                <FiX className="text-2xl" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{currentStep + 1}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{steps[currentStep]?.title}</h2>
                  <p className="text-white text-opacity-90 text-sm mt-1">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-8">
              <p className="text-neutral-700 text-lg leading-relaxed">
                {steps[currentStep]?.description}
              </p>

              {/* Progress dots */}
              <div className="flex items-center justify-center space-x-2 mt-8">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-[#3978FC]'
                        : index < currentStep
                        ? 'w-2 bg-[#7253B7]'
                        : 'w-2 bg-neutral-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-neutral-50 flex items-center justify-between border-t border-neutral-200">
              <button
                onClick={handleClose}
                className="text-neutral-600 hover:text-neutral-800 font-medium transition-colors"
              >
                Skip Tutorial
              </button>
              <div className="flex items-center space-x-3">
                {steps[currentStep]?.action && (
                  <button
                    onClick={handleAction}
                    className="bg-neutral-200 text-neutral-800 px-6 py-3 rounded-lg font-medium hover:bg-neutral-300 transition-colors flex items-center space-x-2"
                  >
                    <span>{steps[currentStep].action}</span>
                    <FiArrowRight />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center space-x-2"
                >
                  <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                  {currentStep === steps.length - 1 ? <FiCheck /> : <FiArrowRight />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

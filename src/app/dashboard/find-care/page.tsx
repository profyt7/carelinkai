'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface FormData {
  // Step 1: Budget & Care Level
  budgetMin: string;
  budgetMax: string;
  careLevel: string;
  
  // Step 2: Medical Conditions
  medicalConditions: string[];
  
  // Step 3: Preferences
  preferredGender: string;
  religion: string;
  dietaryNeeds: string[];
  hobbies: string[];
  petPreferences: string;
  
  // Step 4: Location & Timeline
  zipCode: string;
  maxDistance: string;
  moveInTimeline: string;
}

const STEPS = [
  { id: 1, name: 'Budget & Care', description: 'Set your budget and care needs' },
  { id: 2, name: 'Medical Conditions', description: 'Select relevant conditions' },
  { id: 3, name: 'Preferences', description: 'Lifestyle preferences' },
  { id: 4, name: 'Location & Timeline', description: 'Where and when' }
];

const MEDICAL_CONDITIONS = [
  'Dementia', 'Alzheimer\'s', 'Diabetes', 'Mobility Issues',
  'Incontinence', 'Heart Disease', 'Stroke', 'Parkinson\'s',
  'Arthritis', 'Vision Impairment', 'Hearing Impairment', 'Other'
];

const DIETARY_NEEDS = [
  'Vegetarian', 'Vegan', 'Kosher', 'Halal',
  'Diabetic-Friendly', 'Low-Sodium', 'Gluten-Free', 'Lactose-Free'
];

const HOBBIES = [
  'Gardening', 'Music', 'Arts & Crafts', 'Reading',
  'Walking', 'Cooking', 'Games', 'Movies',
  'Exercise', 'Socializing', 'Pets', 'Technology'
];

export default function FindCarePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    budgetMin: '',
    budgetMax: '',
    careLevel: '',
    medicalConditions: [],
    preferredGender: 'NO_PREFERENCE',
    religion: '',
    dietaryNeeds: [],
    hobbies: [],
    petPreferences: 'NO_PETS',
    zipCode: '',
    maxDistance: '25',
    moveInTimeline: ''
  });
  
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const toggleArrayItem = (field: 'medicalConditions' | 'dietaryNeeds' | 'hobbies', item: string) => {
    const currentArray = formData[field];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFormData(field, newArray);
  };
  
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.budgetMin || parseFloat(formData.budgetMin) <= 0) {
          newErrors.budgetMin = 'Please enter a minimum budget';
        }
        if (!formData.budgetMax || parseFloat(formData.budgetMax) <= 0) {
          newErrors.budgetMax = 'Please enter a maximum budget';
        }
        if (formData.budgetMin && formData.budgetMax && 
            parseFloat(formData.budgetMin) > parseFloat(formData.budgetMax)) {
          newErrors.budgetMax = 'Maximum budget must be greater than minimum';
        }
        if (!formData.careLevel) {
          newErrors.careLevel = 'Please select a care level';
        }
        break;
        
      case 2:
        // Medical conditions are optional
        break;
        
      case 3:
        // All preferences are optional
        break;
        
      case 4:
        if (!formData.zipCode || formData.zipCode.length < 5) {
          newErrors.zipCode = 'Please enter a valid zip code';
        }
        if (!formData.maxDistance || parseFloat(formData.maxDistance) <= 0) {
          newErrors.maxDistance = 'Please enter a maximum distance';
        }
        if (!formData.moveInTimeline) {
          newErrors.moveInTimeline = 'Please select a timeline';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/family/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetMin: parseFloat(formData.budgetMin),
          budgetMax: parseFloat(formData.budgetMax),
          careLevel: formData.careLevel,
          medicalConditions: formData.medicalConditions,
          preferredGender: formData.preferredGender,
          religion: formData.religion || undefined,
          dietaryNeeds: formData.dietaryNeeds,
          hobbies: formData.hobbies,
          petPreferences: formData.petPreferences,
          zipCode: formData.zipCode,
          maxDistance: parseInt(formData.maxDistance),
          moveInTimeline: formData.moveInTimeline
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect to results page
        router.push(`/dashboard/find-care/results/${data.matchRequestId}`);
      } else {
        alert(data.error || 'Failed to find matches. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Find Your Perfect Care Home
          </h1>
          <p className="text-lg text-gray-600">
            Answer a few questions and we'll match you with the best options
          </p>
        </div>
        
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                      ${currentStep >= step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                      }`}
                  >
                    {step.id}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2
                        ${currentStep > step.id
                          ? 'bg-blue-600'
                          : 'bg-gray-300'
                        }`}
                    />
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-900">{step.name}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Step 1: Budget & Care Level */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Budget & Care Level
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Budget ($/month)
                  </label>
                  <input
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => updateFormData('budgetMin', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 3000"
                  />
                  {errors.budgetMin && (
                    <p className="mt-1 text-sm text-red-600">{errors.budgetMin}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Budget ($/month)
                  </label>
                  <input
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => updateFormData('budgetMax', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 5000"
                  />
                  {errors.budgetMax && (
                    <p className="mt-1 text-sm text-red-600">{errors.budgetMax}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Required Care Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { value: 'INDEPENDENT', label: 'Independent Living', desc: 'Minimal assistance needed' },
                    { value: 'ASSISTED', label: 'Assisted Living', desc: 'Help with daily activities' },
                    { value: 'MEMORY_CARE', label: 'Memory Care', desc: 'Dementia/Alzheimer\'s care' },
                    { value: 'SKILLED_NURSING', label: 'Skilled Nursing', desc: '24/7 medical care' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateFormData('careLevel', option.value)}
                      className={`p-4 border-2 rounded-lg text-left transition
                        ${formData.careLevel === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <p className="font-semibold text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
                {errors.careLevel && (
                  <p className="mt-2 text-sm text-red-600">{errors.careLevel}</p>
                )}
              </div>
            </div>
          )}
          
          {/* Step 2: Medical Conditions */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Medical Conditions
              </h2>
              <p className="text-gray-600 mb-4">
                Select any medical conditions that require specialized care (optional)
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MEDICAL_CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleArrayItem('medicalConditions', condition)}
                    className={`p-3 border-2 rounded-lg text-sm font-medium transition
                      ${formData.medicalConditions.includes(condition)
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Lifestyle Preferences
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Caregiver Gender
                </label>
                <select
                  value={formData.preferredGender}
                  onChange={(e) => updateFormData('preferredGender', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="NO_PREFERENCE">No Preference</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Religion/Cultural Preferences (optional)
                </label>
                <input
                  type="text"
                  value={formData.religion}
                  onChange={(e) => updateFormData('religion', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Christian, Jewish, Muslim, Buddhist"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Dietary Needs (optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DIETARY_NEEDS.map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => toggleArrayItem('dietaryNeeds', diet)}
                      className={`p-2 border-2 rounded-md text-sm font-medium transition
                        ${formData.dietaryNeeds.includes(diet)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hobbies & Interests (optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {HOBBIES.map((hobby) => (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleArrayItem('hobbies', hobby)}
                      className={`p-2 border-2 rounded-md text-sm font-medium transition
                        ${formData.hobbies.includes(hobby)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                    >
                      {hobby}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pet Preferences
                </label>
                <select
                  value={formData.petPreferences}
                  onChange={(e) => updateFormData('petPreferences', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="NO_PETS">No Pets</option>
                  <option value="HAS_PETS">Has Pets (needs pet-friendly home)</option>
                  <option value="PET_FRIENDLY">Would like pet therapy/visits</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Step 4: Location & Timeline */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Location & Timeline
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => updateFormData('zipCode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 94102"
                    maxLength={10}
                  />
                  {errors.zipCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Distance (miles)
                  </label>
                  <input
                    type="number"
                    value={formData.maxDistance}
                    onChange={(e) => updateFormData('maxDistance', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="25"
                  />
                  {errors.maxDistance && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxDistance}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Move-in Timeline
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { value: 'IMMEDIATE', label: 'Immediate', desc: 'Ready to move now' },
                    { value: '1_3_MONTHS', label: '1-3 Months', desc: 'Moving soon' },
                    { value: '3_6_MONTHS', label: '3-6 Months', desc: 'Planning ahead' },
                    { value: 'EXPLORING', label: 'Just Exploring', desc: 'Gathering information' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateFormData('moveInTimeline', option.value)}
                      className={`p-4 border-2 rounded-lg text-left transition
                        ${formData.moveInTimeline === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <p className="font-semibold text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
                {errors.moveInTimeline && (
                  <p className="mt-2 text-sm text-red-600">{errors.moveInTimeline}</p>
                )}
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Finding Matches...' : 'Find My Perfect Match'}
              </button>
            )}
          </div>
        </div>
        
        {/* Helper Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your information is secure and will only be used to find the best care options.</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiPlus, 
  FiMinus, 
  FiInfo, 
  FiCheck,
  FiPrinter
} from 'react-icons/fi';

// Types for pricing data
export interface AdditionalService {
  service: string;
  cost: number;
  description?: string;
}

export interface RoomPricing {
  type: string;
  base: number;
  additional: AdditionalService[];
  description?: string;
  availability?: number;
}

export interface OneTimeFee {
  name: string;
  amount: number;
  description?: string;
  required?: boolean;
}

interface PricingCalculatorProps {
  pricing: RoomPricing[];
  oneTimeFees?: OneTimeFee[];
  pricingNotes?: string;
  currency?: string;
  onEstimateComplete?: (estimate: PricingEstimate) => void;
}

export interface PricingEstimate {
  roomType: string;
  basePrice: number;
  selectedServices: AdditionalService[];
  totalMonthly: number;
  selectedOneTimeFees: OneTimeFee[];
  totalOneTime: number;
  firstMonthTotal: number;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  pricing,
  oneTimeFees = [],
  pricingNotes,
  currency = 'USD',
  onEstimateComplete
}) => {
  // State for selected options
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number>(0);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [selectedOneTimeFees, setSelectedOneTimeFees] = useState<Record<string, boolean>>(
    // Initialize with required fees selected
    oneTimeFees.reduce((acc, fee) => {
      if (fee.required) {
        acc[fee.name] = true;
      }
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);
  const [showOneTimeFees, setShowOneTimeFees] = useState<boolean>(oneTimeFees.length > 0);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate totals
  const calculateTotals = (): PricingEstimate => {
    const selectedRoom = pricing[selectedRoomIndex];
    
    // Calculate monthly services
    const selectedServicesList = selectedRoom.additional.filter(
      service => selectedServices[service.service]
    );
    
    const monthlyServicesTotal = selectedServicesList.reduce(
      (total, service) => total + service.cost, 
      0
    );
    
    const totalMonthly = selectedRoom.base + monthlyServicesTotal;
    
    // Calculate one-time fees
    const selectedOneTimeFeesList = oneTimeFees.filter(
      fee => selectedOneTimeFees[fee.name]
    );
    
    const totalOneTime = selectedOneTimeFeesList.reduce(
      (total, fee) => total + fee.amount, 
      0
    );
    
    // First month total (monthly + one-time)
    const firstMonthTotal = totalMonthly + totalOneTime;
    
    return {
      roomType: selectedRoom.type,
      basePrice: selectedRoom.base,
      selectedServices: selectedServicesList,
      totalMonthly,
      selectedOneTimeFees: selectedOneTimeFeesList,
      totalOneTime,
      firstMonthTotal
    };
  };

  // Handle room selection
  const handleRoomSelect = (index: number) => {
    setSelectedRoomIndex(index);
    
    // Reset selected services when room changes
    setSelectedServices({});
  };

  // Toggle service selection
  const toggleService = (service: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  // Toggle one-time fee selection
  const toggleOneTimeFee = (feeName: string, isRequired: boolean = false) => {
    if (isRequired) return; // Can't toggle required fees
    
    setSelectedOneTimeFees(prev => ({
      ...prev,
      [feeName]: !prev[feeName]
    }));
  };

  // Print estimate
  const printEstimate = () => {
    window.print();
  };

  // Notify parent component when estimate changes
  useEffect(() => {
    if (onEstimateComplete) {
      onEstimateComplete(calculateTotals());
    }
  }, [selectedRoomIndex, selectedServices, selectedOneTimeFees]);

  // Get the current estimate
  const estimate = calculateTotals();

  return (
    <div className="pricing-calculator rounded-lg border border-neutral-200 bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-neutral-50 p-4">
        <h3 className="flex items-center text-lg font-semibold text-neutral-800">
          <FiDollarSign className="mr-2 h-5 w-5 text-primary-500" />
          Monthly Cost Calculator
        </h3>
        <p className="text-sm text-neutral-600">
          Estimate your monthly costs based on room type and care services
        </p>
      </div>

      {/* Room type selection */}
      <div className="border-b border-neutral-100 p-4">
        <h4 className="mb-3 font-medium text-neutral-800">Select Room Type</h4>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {pricing.map((room, index) => (
            <div 
              key={`room-${index}`}
              onClick={() => handleRoomSelect(index)}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                selectedRoomIndex === index
                  ? "border-primary-500 bg-primary-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-medium text-neutral-800">{room.type}</h5>
                  <p className="text-lg font-semibold text-primary-600">
                    {formatCurrency(room.base)}<span className="text-sm font-normal text-neutral-500">/month</span>
                  </p>
                </div>
                {selectedRoomIndex === index && (
                  <div className="rounded-full bg-primary-500 p-1 text-white">
                    <FiCheck className="h-4 w-4" />
                  </div>
                )}
              </div>
              {room.description && (
                <p className="mt-1 text-xs text-neutral-600">{room.description}</p>
              )}
              {room.availability !== undefined && (
                <p className="mt-1 text-xs font-medium text-neutral-700">
                  {room.availability > 0 
                    ? `${room.availability} available` 
                    : "Currently full"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional services */}
      <div className="border-b border-neutral-100 p-4">
        <h4 className="mb-3 font-medium text-neutral-800">Additional Care Services</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {pricing[selectedRoomIndex].additional.map((service, index) => (
            <div 
              key={`service-${index}`}
              onClick={() => toggleService(service.service)}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                selectedServices[service.service]
                  ? "border-primary-500 bg-primary-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                  selectedServices[service.service]
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-neutral-300 bg-white"
                }`}>
                  {selectedServices[service.service] && <FiCheck className="h-3 w-3" />}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-neutral-800">{service.service}</p>
                  {service.description && (
                    <p className="text-xs text-neutral-600">{service.description}</p>
                  )}
                </div>
              </div>
              <p className="font-medium text-neutral-700">
                {formatCurrency(service.cost)}<span className="text-xs text-neutral-500">/mo</span>
              </p>
            </div>
          ))}
          
          {pricing[selectedRoomIndex].additional.length === 0 && (
            <p className="col-span-2 text-sm text-neutral-600">
              No additional services available for this room type.
            </p>
          )}
        </div>
      </div>

      {/* One-time fees */}
      {oneTimeFees.length > 0 && (
        <div className="border-b border-neutral-100 p-4">
          <div 
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setShowOneTimeFees(!showOneTimeFees)}
          >
            <h4 className="font-medium text-neutral-800">One-Time Fees</h4>
            <button className="text-neutral-500 hover:text-neutral-700">
              {showOneTimeFees ? <FiMinus className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
            </button>
          </div>
          
          {showOneTimeFees && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {oneTimeFees.map((fee, index) => (
                <div 
                  key={`fee-${index}`}
                  onClick={() => toggleOneTimeFee(fee.name, fee.required)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                    fee.required ? "border-neutral-300 bg-neutral-50" :
                    selectedOneTimeFees[fee.name]
                      ? "border-primary-500 bg-primary-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      fee.required ? "border-neutral-400 bg-neutral-400 text-white" :
                      selectedOneTimeFees[fee.name]
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-neutral-300 bg-white"
                    }`}>
                      {(selectedOneTimeFees[fee.name] || fee.required) && <FiCheck className="h-3 w-3" />}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-neutral-800">
                        {fee.name}
                        {fee.required && <span className="ml-1 text-xs text-neutral-500">(Required)</span>}
                      </p>
                      {fee.description && (
                        <p className="text-xs text-neutral-600">{fee.description}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-neutral-700">
                    {formatCurrency(fee.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cost summary */}
      <div className="p-4">
        <div 
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          <h4 className="font-medium text-neutral-800">Cost Summary</h4>
          <button className="text-neutral-500 hover:text-neutral-700">
            {showBreakdown ? <FiMinus className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
          </button>
        </div>
        
        {showBreakdown && (
          <div className="mt-3 space-y-2 rounded-lg bg-neutral-50 p-4">
            {/* Base room cost */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-700">{estimate.roomType} (Base)</p>
              <p className="font-medium text-neutral-800">{formatCurrency(estimate.basePrice)}</p>
            </div>
            
            {/* Additional services */}
            {estimate.selectedServices.map((service, index) => (
              <div key={`summary-service-${index}`} className="flex items-center justify-between">
                <p className="text-sm text-neutral-700">{service.service}</p>
                <p className="font-medium text-neutral-800">{formatCurrency(service.cost)}</p>
              </div>
            ))}
            
            {/* Monthly subtotal */}
            <div className="border-t border-neutral-200 pt-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-800">Monthly Total</p>
                <p className="text-lg font-semibold text-primary-600">{formatCurrency(estimate.totalMonthly)}</p>
              </div>
            </div>
            
            {/* One-time fees */}
            {estimate.selectedOneTimeFees.length > 0 && (
              <>
                <div className="border-t border-neutral-200 pt-2">
                  <p className="mb-1 text-sm font-medium text-neutral-700">One-Time Fees:</p>
                  {estimate.selectedOneTimeFees.map((fee, index) => (
                    <div key={`summary-fee-${index}`} className="flex items-center justify-between">
                      <p className="text-sm text-neutral-700">{fee.name}</p>
                      <p className="font-medium text-neutral-800">{formatCurrency(fee.amount)}</p>
                    </div>
                  ))}
                </div>
                
                {/* First month total */}
                <div className="border-t border-neutral-200 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-neutral-800">First Month Total</p>
                    <p className="text-lg font-semibold text-primary-600">{formatCurrency(estimate.firstMonthTotal)}</p>
                  </div>
                  <p className="text-xs text-neutral-500">
                    (Monthly cost + one-time fees)
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Notes */}
        {pricingNotes && (
          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
            <div className="flex items-start">
              <FiInfo className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
              <p>{pricingNotes}</p>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="mt-4 flex justify-between">
          <button 
            onClick={printEstimate}
            className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <FiPrinter className="mr-1.5 h-4 w-4" />
            Print Estimate
          </button>
          
          <div className="text-right">
            <p className="text-sm text-neutral-600">Monthly Cost</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(estimate.totalMonthly)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;

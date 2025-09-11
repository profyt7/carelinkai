"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiSave, FiLock, FiUnlock } from "react-icons/fi";

interface EditListingFormProps {
  listing: any;
}

export default function EditListingForm({ listing }: EditListingFormProps) {
  const router = useRouter();
  
  // Initialize form state from listing data
  const [title, setTitle] = useState(listing.title || "");
  const [description, setDescription] = useState(listing.description || "");
  const [city, setCity] = useState(listing.city || "");
  const [state, setState] = useState(listing.state || "");
  const [zipCode, setZipCode] = useState(listing.zipCode || "");
  const [setting, setSetting] = useState(listing.setting || "");
  const [careTypes, setCareTypes] = useState(listing.careTypes?.join(", ") || "");
  const [services, setServices] = useState(listing.services?.join(", ") || "");
  const [specialties, setSpecialties] = useState(listing.specialties?.join(", ") || "");
  const [hourlyRateMin, setHourlyRateMin] = useState(listing.hourlyRateMin?.toString() || "");
  const [hourlyRateMax, setHourlyRateMax] = useState(listing.hourlyRateMax?.toString() || "");
  
  // Format dates for input fields
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  const [startTime, setStartTime] = useState(formatDateForInput(listing.startTime));
  const [endTime, setEndTime] = useState(formatDateForInput(listing.endTime));
  const [status, setStatus] = useState(listing.status || "OPEN");
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Helper to convert comma-separated string to array
  const stringToArray = (str: string) => {
    if (!str.trim()) return [];
    return str.split(",").map(item => item.trim()).filter(Boolean);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          city,
          state,
          zipCode,
          setting: setting || null,
          careTypes: stringToArray(careTypes),
          services: stringToArray(services),
          specialties: stringToArray(specialties),
          hourlyRateMin: hourlyRateMin || null,
          hourlyRateMax: hourlyRateMax || null,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
          status
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update listing");
      }
      
      setSuccess("Listing updated successfully");
      router.refresh();
      
      // Optional: Navigate back to listing page after short delay
      setTimeout(() => {
        router.push(`/marketplace/listings/${listing.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Quick actions for closing/reopening listing
  const updateListingStatus = async (newStatus: "OPEN" | "CLOSED") => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${newStatus === "CLOSED" ? "close" : "reopen"} listing`);
      }
      
      setStatus(newStatus);
      setSuccess(`Listing ${newStatus === "CLOSED" ? "closed" : "reopened"} successfully`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      {/* Status badge */}
      <div className="mb-6">
        <span className="text-sm font-medium text-gray-500 mr-2">Current Status:</span>
        {status === "OPEN" ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Open
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Closed
          </span>
        )}
      </div>
      
      {/* Quick actions */}
      <div className="mb-6 flex space-x-4">
        {status === "OPEN" ? (
          <button
            type="button"
            onClick={() => updateListingStatus("CLOSED")}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <FiLock className="mr-2" />
            Close Listing
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateListingStatus("OPEN")}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <FiUnlock className="mr-2" />
            Reopen Listing
          </button>
        )}
      </div>
      
      {/* Error and success messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      {/* Edit form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            ></textarea>
          </div>
          
          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {/* Setting */}
          <div>
            <label htmlFor="setting" className="block text-sm font-medium text-gray-700 mb-1">
              Care Setting
            </label>
            <input
              type="text"
              id="setting"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          
          {/* Categories */}
          <div className="space-y-4">
            <div>
              <label htmlFor="careTypes" className="block text-sm font-medium text-gray-700 mb-1">
                Care Types (comma-separated)
              </label>
              <input
                type="text"
                id="careTypes"
                value={careTypes}
                onChange={(e) => setCareTypes(e.target.value)}
                placeholder="Type 1, Type 2, Type 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="services" className="block text-sm font-medium text-gray-700 mb-1">
                Services (comma-separated)
              </label>
              <input
                type="text"
                id="services"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Service 1, Service 2, Service 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
                Specialties (comma-separated)
              </label>
              <input
                type="text"
                id="specialties"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder="Specialty 1, Specialty 2, Specialty 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {/* Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hourlyRateMin" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Hourly Rate ($)
              </label>
              <input
                type="number"
                id="hourlyRateMin"
                min="0"
                step="0.01"
                value={hourlyRateMin}
                onChange={(e) => setHourlyRateMin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="hourlyRateMax" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Hourly Rate ($)
              </label>
              <input
                type="number"
                id="hourlyRateMax"
                min="0"
                step="0.01"
                value={hourlyRateMax}
                onChange={(e) => setHourlyRateMax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Listing Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            >
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          
          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <FiSave className="mr-2" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

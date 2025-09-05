"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  FiSearch, 
  FiFilter, 
  FiMapPin, 
  FiDollarSign, 
  FiCalendar, 
  FiPlus,
  FiX
} from "react-icons/fi";

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any>({});
  const [listings, setListings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [selectedSetting, setSelectedSetting] = useState("");
  const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  
  // Form state for creating a listing
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "",
    state: "",
    zipCode: "",
    hourlyRateMin: "",
    hourlyRateMax: "",
    setting: "",
    careTypes: [] as string[],
    services: [] as string[],
    specialties: [] as string[]
  });

  useEffect(() => {
    // Check feature flag
    const featureEnabled = process.env["NEXT_PUBLIC_MARKETPLACE_ENABLED"] !== "false";
    setIsFeatureEnabled(featureEnabled);
    
    if (featureEnabled) {
      fetchCategories();
      fetchListings();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch listings when filters change
  useEffect(() => {
    if (isFeatureEnabled) {
      fetchListings();
    }
  }, [searchQuery, city, state, selectedSetting, selectedCareTypes, selectedServices, selectedSpecialties]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/marketplace/categories");
      const data = await response.json();
      // Ensure categories is always an object to avoid undefined look-ups
      setCategories(data.data || {});
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (city) params.append("city", city);
      if (state) params.append("state", state);
      if (selectedSetting) params.append("setting", selectedSetting);
      
      if (selectedCareTypes.length > 0) {
        params.append("careTypes", selectedCareTypes.join(","));
      }
      
      if (selectedServices.length > 0) {
        params.append("services", selectedServices.join(","));
      }
      
      if (selectedSpecialties.length > 0) {
        params.append("specialties", selectedSpecialties.join(","));
      }
      
      const response = await fetch(`/api/marketplace/listings?${params.toString()}`);
      const data = await response.json();
      setListings(data.data || []);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (category: string, type: 'careTypes' | 'services' | 'specialties') => {
    switch (type) {
      case 'careTypes':
        setSelectedCareTypes(prev => 
          prev.includes(category) 
            ? prev.filter(item => item !== category)
            : [...prev, category]
        );
        break;
      case 'services':
        setSelectedServices(prev => 
          prev.includes(category) 
            ? prev.filter(item => item !== category)
            : [...prev, category]
        );
        break;
      case 'specialties':
        setSelectedSpecialties(prev => 
          prev.includes(category) 
            ? prev.filter(item => item !== category)
            : [...prev, category]
        );
        break;
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxFormChange = (category: string, type: 'careTypes' | 'services' | 'specialties') => {
    setFormData(prev => {
      const currentArray = [...prev[type]];
      const newArray = currentArray.includes(category)
        ? currentArray.filter(item => item !== category)
        : [...currentArray, category];
      
      return {
        ...prev,
        [type]: newArray
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({
          title: "",
          description: "",
          city: "",
          state: "",
          zipCode: "",
          hourlyRateMin: "",
          hourlyRateMax: "",
          setting: "",
          careTypes: [],
          services: [],
          specialties: []
        });
        fetchListings();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to create listing"}`);
      }
    } catch (error) {
      console.error("Error creating listing:", error);
      alert("An error occurred while creating the listing");
    }
  };

  // If feature is disabled, show coming soon message
  if (!isFeatureEnabled) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Marketplace is coming soon</h1>
          <p className="text-gray-600">
            We're working hard to bring you a marketplace where you can connect with caregivers and care facilities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      {/* Filters Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Filters</h2>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search listings..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>
        </div>
        
        {/* Care Settings */}
        {categories?.SETTING && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Care Setting</h3>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={selectedSetting}
              onChange={(e) => setSelectedSetting(e.target.value)}
            >
              <option value="">Any Setting</option>
              {categories.SETTING?.map((category: any) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Care Types */}
        {categories?.CARE_TYPE && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Care Types</h3>
            <div className="space-y-2">
              {categories.CARE_TYPE?.map((category: any) => (
                <div key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`care-type-${category.slug}`}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={selectedCareTypes.includes(category.slug)}
                    onChange={() => handleCheckboxChange(category.slug, 'careTypes')}
                  />
                  <label htmlFor={`care-type-${category.slug}`} className="ml-2 text-sm text-gray-700">
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Services */}
        {categories?.SERVICE && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Services</h3>
            <div className="space-y-2">
              {categories.SERVICE?.map((category: any) => (
                <div key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`service-${category.slug}`}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={selectedServices.includes(category.slug)}
                    onChange={() => handleCheckboxChange(category.slug, 'services')}
                  />
                  <label htmlFor={`service-${category.slug}`} className="ml-2 text-sm text-gray-700">
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Specialties */}
        {categories?.SPECIALTY && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Specialties</h3>
            <div className="space-y-2">
              {categories.SPECIALTY?.map((category: any) => (
                <div key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`specialty-${category.slug}`}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={selectedSpecialties.includes(category.slug)}
                    onChange={() => handleCheckboxChange(category.slug, 'specialties')}
                  />
                  <label htmlFor={`specialty-${category.slug}`} className="ml-2 text-sm text-gray-700">
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Marketplace</h1>
          
          {session?.user && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiPlus className="mr-2" />
              Post a Listing
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-500">Try adjusting your filters or create a new listing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">{listing.title}</h3>
                  
                  <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                    <FiMapPin className="mt-0.5 flex-shrink-0" />
                    <span>
                      {[listing.city, listing.state].filter(Boolean).join(", ") || "Location not specified"}
                    </span>
                  </div>
                  
                  {(listing.hourlyRateMin || listing.hourlyRateMax) && (
                    <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                      <FiDollarSign className="mt-0.5 flex-shrink-0" />
                      <span>
                        {listing.hourlyRateMin && listing.hourlyRateMax
                          ? `$${listing.hourlyRateMin} - $${listing.hourlyRateMax}/hr`
                          : listing.hourlyRateMin
                          ? `From $${listing.hourlyRateMin}/hr`
                          : `Up to $${listing.hourlyRateMax}/hr`}
                      </span>
                    </div>
                  )}
                  
                  {(listing.startTime || listing.endTime) && (
                    <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                      <FiCalendar className="mt-0.5 flex-shrink-0" />
                      <span>
                        {listing.startTime && listing.endTime
                          ? `${new Date(listing.startTime).toLocaleDateString()} - ${new Date(listing.endTime).toLocaleDateString()}`
                          : listing.startTime
                          ? `From ${new Date(listing.startTime).toLocaleDateString()}`
                          : `Until ${new Date(listing.endTime).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                  
                  <p className="text-gray-600 mt-2 line-clamp-2">{listing.description}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {listing.setting && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {listing.setting}
                      </span>
                    )}
                    
                    {listing.careTypes && listing.careTypes.slice(0, 2).map((type: string) => (
                      <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Posted {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/marketplace/listings/${listing.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Create Listing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Create New Listing</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={formData.title}
                    onChange={handleFormChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={formData.description}
                    onChange={handleFormChange}
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={formData.city}
                      onChange={handleFormChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={formData.state}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={formData.zipCode}
                    onChange={handleFormChange}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="hourlyRateMin" className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      id="hourlyRateMin"
                      name="hourlyRateMin"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={formData.hourlyRateMin}
                      onChange={handleFormChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="hourlyRateMax" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      id="hourlyRateMax"
                      name="hourlyRateMax"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={formData.hourlyRateMax}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                
                {categories?.SETTING && (
                  <div>
                    <label htmlFor="setting" className="block text-sm font-medium text-gray-700 mb-1">
                      Care Setting
                    </label>
                    <select
                      id="setting"
                      name="setting"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={formData.setting}
                      onChange={handleFormChange}
                    >
                      <option value="">Select a setting</option>
                      {categories.SETTING?.map((category: any) => (
                        <option key={category.id} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {categories?.CARE_TYPE && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Care Types</span>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.CARE_TYPE?.map((category: any) => (
                        <div key={category.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`form-care-type-${category.slug}`}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={formData.careTypes.includes(category.slug)}
                            onChange={() => handleCheckboxFormChange(category.slug, 'careTypes')}
                          />
                          <label htmlFor={`form-care-type-${category.slug}`} className="ml-2 text-sm text-gray-700">
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {categories?.SERVICE && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Services</span>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.SERVICE?.map((category: any) => (
                        <div key={category.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`form-service-${category.slug}`}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={formData.services.includes(category.slug)}
                            onChange={() => handleCheckboxFormChange(category.slug, 'services')}
                          />
                          <label htmlFor={`form-service-${category.slug}`} className="ml-2 text-sm text-gray-700">
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {categories?.SPECIALTY && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Specialties</span>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.SPECIALTY?.map((category: any) => (
                        <div key={category.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`form-specialty-${category.slug}`}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={formData.specialties.includes(category.slug)}
                            onChange={() => handleCheckboxFormChange(category.slug, 'specialties')}
                          />
                          <label htmlFor={`form-specialty-${category.slug}`} className="ml-2 text-sm text-gray-700">
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

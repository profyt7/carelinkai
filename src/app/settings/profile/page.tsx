"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCamera, 
  FiSave, 
  FiAlertCircle,
  FiCheck,
  FiLoader,
  FiTrash2,
  FiPlus,
  FiFile,
  FiUpload,
  FiCheckCircle,
  FiXCircle
} from "react-icons/fi";

// Profile schema for validation
const baseProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
});

// Role-specific schemas
const familySchema = baseProfileSchema.extend({
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
});

const operatorSchema = baseProfileSchema.extend({
  companyName: z.string().min(2, "Company name must be at least 2 characters").optional(),
  taxId: z.string().optional().nullable(),
  businessLicense: z.string().optional().nullable(),
});

const caregiverSchema = baseProfileSchema.extend({
  bio: z.string().optional().nullable(),
  yearsExperience: z.number().int().min(0).optional().nullable(),
  hourlyRate: z.number().min(0).optional().nullable(),
});

const affiliateSchema = baseProfileSchema.extend({
  organization: z.string().optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional().nullable(),
});

// Address schema
const addressSchema = z.object({
  street: z.string().min(3, "Street address must be at least 3 characters"),
  street2: z.string().optional().nullable(),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
  country: z.string().default("USA"),
});

// Credential schema
const credentialSchema = z.object({
  type: z.string().min(1, "Type is required"),
  issueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Issue date must be a valid date",
  }),
  expirationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Expiration date must be a valid date",
  }),
}).refine(data => {
  const issueDate = new Date(data.issueDate);
  const expirationDate = new Date(data.expirationDate);
  return expirationDate > issueDate;
}, {
  message: "Expiration date must be after issue date",
  path: ["expirationDate"],
});

export default function ProfileSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const credFileInputRef = useRef<HTMLInputElement>(null);
  
  // State for profile data
  const [profile, setProfile] = useState<any>(null);
  const [roleSpecificData, setRoleSpecificData] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  
  // Form state
  const [formData, setFormData] = useState<any>({});
  const [addressData, setAddressData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [addressErrors, setAddressErrors] = useState<any>({});
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Credentials state
  const [credentials, setCredentials] = useState<any[]>([]);
  const [credLoading, setCredLoading] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newCred, setNewCred] = useState({
    type: "",
    issueDate: "",
    expirationDate: "",
    file: null as File | null
  });
  const [credErrors, setCredErrors] = useState<any>({});
  
  // Fetch profile data
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings/profile");
      return;
    }
    
    if (status === "authenticated") {
      fetchProfileData();
    }
  }, [status, router, fetchProfileData]);
  
  // Fetch credentials if user is a caregiver
  useEffect(() => {
    if (userRole === "CAREGIVER") {
      fetchCredentials();
    }
  }, [userRole]);
  
  // Fetch profile data from API
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch profile data");
      }
      
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.data.user);
        setRoleSpecificData(data.data.roleSpecificData);
        setAddresses(data.data.addresses || []);
        setUserRole(data.data.role);
        
        // Initialize form data
        setFormData({
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          phone: data.data.user.phone || "",
          ...extractRoleSpecificFormData(data.data.roleSpecificData, data.data.role),
        });
        
        // Initialize address data
        if (data.data.addresses && data.data.addresses.length > 0) {
          setAddressData({
            street: data.data.addresses[0].street || "",
            street2: data.data.addresses[0].street2 || "",
            city: data.data.addresses[0].city || "",
            state: data.data.addresses[0].state || "",
            zipCode: data.data.addresses[0].zipCode || "",
            country: data.data.addresses[0].country || "USA",
          });
        } else {
          setAddressData({
            street: "",
            street2: "",
            city: "",
            state: "",
            zipCode: "",
            country: "USA",
          });
        }
        
        // Set photo preview if exists
        if (data.data.user.profileImageUrl) {
          const photoUrl = typeof data.data.user.profileImageUrl === 'string' 
            ? data.data.user.profileImageUrl 
            : data.data.user.profileImageUrl.medium || data.data.user.profileImageUrl.thumbnail;
          
          setPhotoPreview(photoUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({
        type: "error",
        text: "Failed to load profile data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch caregiver credentials
  const fetchCredentials = async () => {
    try {
      setCredLoading(true);
      const res = await fetch("/api/caregiver/credentials", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch credentials");
      }
      
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      setMessage({
        type: "error",
        text: "Failed to load credentials. Please try again.",
      });
    } finally {
      setCredLoading(false);
    }
  };
  
  // Extract role-specific data based on user role
  const extractRoleSpecificFormData = (data: any, role: string) => {
    if (!data) return {};
    
    switch (role) {
      case "FAMILY":
        return {
          emergencyContact: data.emergencyContact || "",
          emergencyPhone: data.emergencyPhone || "",
        };
      case "OPERATOR":
        return {
          companyName: data.companyName || "",
          taxId: data.taxId || "",
          businessLicense: data.businessLicense || "",
        };
      case "CAREGIVER":
        return {
          bio: data.bio || "",
          yearsExperience: data.yearsExperience || "",
          hourlyRate: data.hourlyRate || "",
        };
      case "AFFILIATE":
        return {
          organization: data.organization || "",
          commissionRate: data.commissionRate || "",
        };
      default:
        return {};
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle address input changes
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressData((prev: any) => ({ ...prev, [name]: value }));
    
    // Clear error for this field if exists
    if (addressErrors[name]) {
      setAddressErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle numeric input changes
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === "" ? "" : Number(value);
    setFormData((prev: any) => ({ ...prev, [name]: numValue }));
  };
  
  // Handle credential input changes
  const handleCredInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCred((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field if exists
    if (credErrors[name]) {
      setCredErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle credential file input
  const handleCredFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCred((prev) => ({ ...prev, file }));
      
      // Clear file error if exists
      if (credErrors.file) {
        setCredErrors((prev: any) => {
          const newErrors = { ...prev };
          delete newErrors.file;
          return newErrors;
        });
      }
    }
  };
  
  // Validate form data
  const validateForm = () => {
    try {
      // Select schema based on role
      let schema;
      switch (userRole) {
        case "FAMILY":
          schema = familySchema;
          break;
        case "OPERATOR":
          schema = operatorSchema;
          break;
        case "CAREGIVER":
          schema = caregiverSchema;
          break;
        case "AFFILIATE":
          schema = affiliateSchema;
          break;
        default:
          schema = baseProfileSchema;
      }
      
      // Validate profile data
      schema.parse(formData);
      
      // Validate address if any field is filled
      const hasAddressData = Object.values(addressData).some(
        (value) => value && value !== ""
      );
      
      if (hasAddressData) {
        addressSchema.parse(addressData);
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        const addrErrors: any = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (path.startsWith("street") || path.startsWith("city") || 
              path.startsWith("state") || path.startsWith("zipCode") || 
              path.startsWith("country")) {
            addrErrors[path] = err.message;
          } else {
            fieldErrors[path] = err.message;
          }
        });
        
        setErrors(fieldErrors);
        setAddressErrors(addrErrors);
      }
      return false;
    }
  };
  
  // Validate credential form
  const validateCredForm = () => {
    try {
      // Validate credential data
      credentialSchema.parse(newCred);
      
      // Validate file is selected
      if (!newCred.file) {
        setCredErrors({ file: "Please select a file" });
        return false;
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        
        setCredErrors(fieldErrors);
      }
      return false;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please correct the errors in the form.",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Prepare data for API
      const profileData = {
        ...formData,
      };
      
      // Add address if any field is filled
      const hasAddressData = Object.values(addressData).some(
        (value) => value && value !== ""
      );
      
      if (hasAddressData) {
        profileData.address = addressData;
      }
      
      // Send to API
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
        
        // Refresh profile data and session (update JWT with new image)
        fetchProfileData();
        await getSession();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update profile.",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: "An error occurred while updating your profile.",
      });
    } finally {
      setSaving(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle credential submission
  const handleCredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCredForm()) {
      return;
    }
    
    try {
      setCredSaving(true);
      let documentUrl = "";
      
      // If file is selected, upload it first
      if (newCred.file) {
        // Get presigned URL
        const urlRes = await fetch("/api/caregiver/credentials/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: newCred.file.name,
            contentType: newCred.file.type,
          }),
        });
        
        if (!urlRes.ok) {
          throw new Error("Failed to get upload URL");
        }
        
        const urlData = await urlRes.json();
        
        // Upload file to presigned URL
        const uploadRes = await fetch(urlData.url, {
          method: "PUT",
          headers: {
            "Content-Type": newCred.file.type,
          },
          body: newCred.file,
        });
        
        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }
        
        documentUrl = urlData.fileUrl;
      }
      
      // Create credential
      const credRes = await fetch("/api/caregiver/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: newCred.type,
          issueDate: newCred.issueDate,
          expirationDate: newCred.expirationDate,
          documentUrl,
        }),
      });
      
      if (!credRes.ok) {
        throw new Error("Failed to create credential");
      }
      
      // Reset form and refresh credentials
      setNewCred({
        type: "",
        issueDate: "",
        expirationDate: "",
        file: null,
      });
      
      if (credFileInputRef.current) {
        credFileInputRef.current.value = "";
      }
      
      setMessage({
        type: "success",
        text: "Credential added successfully!",
      });
      
      // Refresh credentials list
      fetchCredentials();
    } catch (error) {
      console.error("Error creating credential:", error);
      setMessage({
        type: "error",
        text: "Failed to add credential. Please try again.",
      });
    } finally {
      setCredSaving(false);
      setUploadProgress(0);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle credential deletion
  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credential?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/caregiver/credentials/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete credential");
      }
      
      setMessage({
        type: "success",
        text: "Credential deleted successfully!",
      });
      
      // Refresh credentials list
      fetchCredentials();
    } catch (error) {
      console.error("Error deleting credential:", error);
      setMessage({
        type: "error",
        text: "Failed to delete credential. Please try again.",
      });
    }
  };
  
  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type and size
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      setMessage({
        type: "error",
        text: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
      });
      return;
    }
    
    if (file.size > maxSize) {
      setMessage({
        type: "error",
        text: "File is too large. Maximum size is 5MB.",
      });
      return;
    }
    
    try {
      setUploadingPhoto(true);
      
      // Create form data
      const formData = new FormData();
      formData.append("photo", file);
      
      // Upload to API
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Profile photo uploaded successfully!",
        });
        
        // Set preview
        if (data.data.photoUrls.medium) {
          setPhotoPreview(data.data.photoUrls.medium);
        } else if (data.data.photoUrls.thumbnail) {
          setPhotoPreview(data.data.photoUrls.thumbnail);
        }
        
        // Refresh profile data and session (remove image from JWT)
        fetchProfileData();
        await getSession();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to upload photo.",
        });
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      setMessage({
        type: "error",
        text: "An error occurred while uploading your photo.",
      });
    } finally {
      setUploadingPhoto(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle photo deletion
  const handleDeletePhoto = async () => {
    if (!photoPreview) return;
    
    try {
      setUploadingPhoto(true);
      
      const res = await fetch("/api/profile/photo", {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Profile photo removed successfully!",
        });
        
        // Clear preview
        setPhotoPreview(null);
        
        // Refresh profile data
        fetchProfileData();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to remove photo.",
        });
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      setMessage({
        type: "error",
        text: "An error occurred while removing your photo.",
      });
    } finally {
      setUploadingPhoto(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Render role-specific fields based on user role
  const renderRoleSpecificFields = () => {
    switch (userRole) {
      case "FAMILY":
        return (
          <>
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-neutral-700">
                Emergency Contact Name
              </label>
              <input
                type="text"
                name="emergencyContact"
                id="emergencyContact"
                value={formData.emergencyContact || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.emergencyContact && (
                <p className="mt-1 text-sm text-red-600">{errors.emergencyContact}</p>
              )}
            </div>
            
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="emergencyPhone" className="block text-sm font-medium text-neutral-700">
                Emergency Contact Phone
              </label>
              <input
                type="text"
                name="emergencyPhone"
                id="emergencyPhone"
                value={formData.emergencyPhone || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.emergencyPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.emergencyPhone}</p>
              )}
            </div>
          </>
        );
      
      case "OPERATOR":
        return (
          <>
            <div className="col-span-6">
              <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                id="companyName"
                value={formData.companyName || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
              )}
            </div>
            
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="taxId" className="block text-sm font-medium text-neutral-700">
                Tax ID / EIN
              </label>
              <input
                type="text"
                name="taxId"
                id="taxId"
                value={formData.taxId || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.taxId && (
                <p className="mt-1 text-sm text-red-600">{errors.taxId}</p>
              )}
            </div>
            
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="businessLicense" className="block text-sm font-medium text-neutral-700">
                Business License Number
              </label>
              <input
                type="text"
                name="businessLicense"
                id="businessLicense"
                value={formData.businessLicense || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.businessLicense && (
                <p className="mt-1 text-sm text-red-600">{errors.businessLicense}</p>
              )}
            </div>
          </>
        );
      
      case "CAREGIVER":
        return (
          <>
            <div className="col-span-6">
              <label htmlFor="bio" className="block text-sm font-medium text-neutral-700">
                Professional Bio
              </label>
              <textarea
                name="bio"
                id="bio"
                rows={3}
                value={formData.bio || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-600">{errors.bio}</p>
              )}
            </div>
            
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="yearsExperience" className="block text-sm font-medium text-neutral-700">
                Years of Experience
              </label>
              <input
                type="number"
                name="yearsExperience"
                id="yearsExperience"
                min="0"
                value={formData.yearsExperience || ""}
                onChange={handleNumericChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.yearsExperience && (
                <p className="mt-1 text-sm text-red-600">{errors.yearsExperience}</p>
              )}
            </div>
            
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-neutral-700">
                Hourly Rate ($)
              </label>
              <input
                type="number"
                name="hourlyRate"
                id="hourlyRate"
                min="0"
                step="0.01"
                value={formData.hourlyRate || ""}
                onChange={handleNumericChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-sm text-red-600">{errors.hourlyRate}</p>
              )}
            </div>
            
            {/* Credentials Section */}
            <div className="col-span-6 mt-6">
              <h3 className="text-lg font-medium text-neutral-800">Credentials</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Add your professional credentials, certifications, and licenses.
              </p>
              
              {/* Add Credential Form */}
              <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <h4 className="text-md font-medium text-neutral-700">Add New Credential</h4>
                <form onSubmit={handleCredSubmit} className="mt-3 grid grid-cols-6 gap-4">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="type" className="block text-sm font-medium text-neutral-700">
                      Credential Type
                    </label>
                    <input
                      type="text"
                      name="type"
                      id="type"
                      placeholder="e.g., CPR, License, Certification"
                      value={newCred.type}
                      onChange={handleCredInputChange}
                      className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                    {credErrors.type && (
                      <p className="mt-1 text-sm text-red-600">{credErrors.type}</p>
                    )}
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="issueDate" className="block text-sm font-medium text-neutral-700">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      name="issueDate"
                      id="issueDate"
                      value={newCred.issueDate}
                      onChange={handleCredInputChange}
                      className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                    {credErrors.issueDate && (
                      <p className="mt-1 text-sm text-red-600">{credErrors.issueDate}</p>
                    )}
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="expirationDate" className="block text-sm font-medium text-neutral-700">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      name="expirationDate"
                      id="expirationDate"
                      value={newCred.expirationDate}
                      onChange={handleCredInputChange}
                      className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                    {credErrors.expirationDate && (
                      <p className="mt-1 text-sm text-red-600">{credErrors.expirationDate}</p>
                    )}
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="credFile" className="block text-sm font-medium text-neutral-700">
                      Document
                    </label>
                    <div className="mt-1 flex items-center">
                      <input
                        type="file"
                        ref={credFileInputRef}
                        id="credFile"
                        onChange={handleCredFileChange}
                        className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                        required
                      />
                    </div>
                    {credErrors.file && (
                      <p className="mt-1 text-sm text-red-600">{credErrors.file}</p>
                    )}
                  </div>
                  
                  <div className="col-span-6 mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={credSaving}
                      className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      {credSaving ? (
                        <>
                          <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-2 h-4 w-4" />
                          Add Credential
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              
              {/* Credentials List */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-neutral-700">Your Credentials</h4>
                {credLoading ? (
                  <div className="mt-4 flex justify-center py-4">
                    <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : credentials.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">
                    No credentials added yet. Add your first credential above.
                  </p>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-md border border-neutral-200">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Issue Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Expiration Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Verified
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {credentials.map((cred) => (
                          <tr key={cred.id}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                              {cred.type}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                              {formatDate(cred.issueDate)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                              {formatDate(cred.expirationDate)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                              {cred.isVerified ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  <FiCheckCircle className="mr-1 h-3 w-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                  <FiXCircle className="mr-1 h-3 w-3" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                              {cred.documentUrl && (
                                <a
                                  href={cred.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mr-3 text-primary-600 hover:text-primary-900"
                                >
                                  <FiFile className="inline h-4 w-4" />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteCredential(cred.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <FiTrash2 className="inline h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      
      case "AFFILIATE":
        return (
          <>
            <div className="col-span-6">
              <label htmlFor="organization" className="block text-sm font-medium text-neutral-700">
                Organization Name
              </label>
              <input
                type="text"
                name="organization"
                id="organization"
                value={formData.organization || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.organization && (
                <p className="mt-1 text-sm text-red-600">{errors.organization}</p>
              )}
            </div>
            
            <div className="col-span-6">
              <label htmlFor="commissionRate" className="block text-sm font-medium text-neutral-700">
                Commission Rate (%)
              </label>
              <input
                type="number"
                name="commissionRate"
                id="commissionRate"
                min="0"
                max="100"
                step="0.01"
                value={formData.commissionRate || ""}
                onChange={handleNumericChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.commissionRate && (
                <p className="mt-1 text-sm text-red-600">{errors.commissionRate}</p>
              )}
            </div>
          </>
        );
      
      default:
        return null;
    }
  };
  
  // If loading, show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg font-medium text-neutral-700">Loading profile...</span>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show message
  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800">Authentication Required</h1>
          <p className="mt-2 text-neutral-600">
            Please{" "}
            <Link href="/auth/login?callbackUrl=/settings/profile" className="text-primary-600 hover:underline">
              sign in
            </Link>{" "}
            to view your profile settings.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Profile Settings</h1>
        <Link
          href="/dashboard"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {message.text && (
        <div
          className={`mb-6 rounded-md p-4 ${
            message.type === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          <div className="flex items-center">
            {message.type === "error" ? (
              <FiAlertCircle className="mr-2 h-5 w-5" />
            ) : (
              <FiCheck className="mr-2 h-5 w-5" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}
      
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {/* Photo section */}
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-start">
            <div className="relative mb-4 h-32 w-32 overflow-hidden rounded-full bg-neutral-200 sm:mb-0">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Profile"
                  width={128}
                  height={128}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FiUser className="h-16 w-16 text-neutral-400" />
                </div>
              )}
            </div>
            
            <div className="ml-0 mt-4 flex flex-col sm:ml-6 sm:mt-0">
              <h3 className="text-lg font-medium text-neutral-800">
                {profile?.firstName} {profile?.lastName}
              </h3>
              <p className="text-sm text-neutral-500">{profile?.email}</p>
              <p className="mt-1 text-sm text-neutral-500">
                <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800">
                  {userRole?.charAt(0) + userRole?.slice(1).toLowerCase()}
                </span>
              </p>
              
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                >
                  {uploadingPhoto ? (
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FiCamera className="mr-2 h-4 w-4" />
                  )}
                  {photoPreview ? "Change Photo" : "Upload Photo"}
                </button>
                
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    disabled={uploadingPhoto}
                    className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Remove
                  </button>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Form section */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              {/* Basic information */}
              <div className="col-span-6">
                <h3 className="text-lg font-medium text-neutral-800">Basic Information</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Update your personal information and contact details.
                </p>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  id="firstName"
                  value={formData.firstName || ""}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  id="lastName"
                  value={formData.lastName || ""}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  Email Address
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500">
                    <FiMail className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="email"
                    id="email"
                    value={profile?.email || ""}
                    className="block w-full rounded-none rounded-r-md border-neutral-300 bg-neutral-50 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Email cannot be changed. Contact support for assistance.
                </p>
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                  Phone Number
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500">
                    <FiPhone className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    className="block w-full rounded-none rounded-r-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
              
              {/* Role-specific fields */}
              {userRole && (
                <>
                  <div className="col-span-6 mt-6">
                    <h3 className="text-lg font-medium text-neutral-800">
                      {userRole.charAt(0) + userRole.slice(1).toLowerCase()} Information
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Additional information specific to your role.
                    </p>
                  </div>
                  
                  {renderRoleSpecificFields()}
                </>
              )}
              
              {/* Address information */}
              <div className="col-span-6 mt-6">
                <h3 className="text-lg font-medium text-neutral-800">Address Information</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Your primary address information.
                </p>
              </div>
              
              <div className="col-span-6">
                <label htmlFor="street" className="block text-sm font-medium text-neutral-700">
                  Street Address
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500">
                    <FiMapPin className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="street"
                    id="street"
                    value={addressData.street || ""}
                    onChange={handleAddressChange}
                    className="block w-full rounded-none rounded-r-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                {addressErrors.street && (
                  <p className="mt-1 text-sm text-red-600">{addressErrors.street}</p>
                )}
              </div>
              
              <div className="col-span-6">
                <label htmlFor="street2" className="block text-sm font-medium text-neutral-700">
                  Apartment, Suite, etc. (optional)
                </label>
                <input
                  type="text"
                  name="street2"
                  id="street2"
                  value={addressData.street2 || ""}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium text-neutral-700">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  value={addressData.city || ""}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                {addressErrors.city && (
                  <p className="mt-1 text-sm text-red-600">{addressErrors.city}</p>
                )}
              </div>
              
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="state" className="block text-sm font-medium text-neutral-700">
                  State / Province
                </label>
                <input
                  type="text"
                  name="state"
                  id="state"
                  value={addressData.state || ""}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                {addressErrors.state && (
                  <p className="mt-1 text-sm text-red-600">{addressErrors.state}</p>
                )}
              </div>
              
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="zipCode" className="block text-sm font-medium text-neutral-700">
                  ZIP / Postal Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  id="zipCode"
                  value={addressData.zipCode || ""}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                {addressErrors.zipCode && (
                  <p className="mt-1 text-sm text-red-600">{addressErrors.zipCode}</p>
                )}
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="country" className="block text-sm font-medium text-neutral-700">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  id="country"
                  value={addressData.country || "USA"}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                {addressErrors.country && (
                  <p className="mt-1 text-sm text-red-600">{addressErrors.country}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-50 px-4 py-3 text-right sm:px-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {saving ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-6 flex justify-between">
        <Link
          href="/settings/account"
          className="text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          Account Settings
        </Link>
        
        <Link
          href="/dashboard"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-500"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

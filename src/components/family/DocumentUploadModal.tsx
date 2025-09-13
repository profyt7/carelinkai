"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Dialog, Transition, Listbox } from "@headlessui/react";
import { 
  FiX, 
  FiUpload, 
  FiFile, 
  FiTrash2, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiLock,
  FiChevronDown,
  FiPlus,
  FiTag
} from "react-icons/fi";
import Image from "next/image";
import type { FamilyDocumentType } from "@/lib/types/family";

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/heic",
  "image/heif",
  // Other
  "application/zip",
  "application/x-zip-compressed"
];

// Document type options
const DOCUMENT_TYPES = [
  { id: "CARE_PLAN", name: "Care Plan" },
  { id: "MEDICAL_RECORD", name: "Medical Record" },
  { id: "INSURANCE_DOCUMENT", name: "Insurance Document" },
  { id: "LEGAL_DOCUMENT", name: "Legal Document" },
  { id: "FINANCIAL_DOCUMENT", name: "Financial Document" },
  { id: "MEDICATION_LIST", name: "Medication List" },
  { id: "CONTACT_INFO", name: "Contact Information" },
  { id: "OTHER", name: "Other" }
];

type UploadDocument = {
  familyId: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  file: File;
  type: FamilyDocumentType;
  isEncrypted: boolean;
  tags: string[];
};

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  progress: number;
  error?: string;
  uploaded?: boolean;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadDocument[]) => Promise<void>;
  familyId: string;
  initialFiles?: File[];
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onUpload,
  familyId,
  initialFiles = []
}: DocumentUploadModalProps) {
  // Form state
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<FamilyDocumentType>("CARE_PLAN");
  // track if user manually changed document type
  const [userTouchedType, setUserTouchedType] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(true);
  
  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------*/
  const guessType = (incoming: File[]): FamilyDocumentType => {
    if (incoming.some((f) => f.type.startsWith("image/"))) return "PHOTO";
    if (incoming.some((f) => f.type.startsWith("video/"))) return "VIDEO";
    if (incoming.some((f) => f.type === "application/pdf")) return "OTHER";
    return "OTHER";
  };

  /* ------------------------------------------------------------------
     Prefill files when modal opens
  ------------------------------------------------------------------*/
  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0) {
      // avoid duplicates by resetting first
      setFiles([]);
      addFiles(initialFiles);
    }
    if (isOpen) {
      try {
        const savedType = localStorage.getItem("docUpload:lastType");
        if (savedType) setDocumentType(savedType as FamilyDocumentType);
        const savedTags = localStorage.getItem("docUpload:lastTags");
        if (savedTags) setTags(JSON.parse(savedTags));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFiles]);
  
  // persist prefs
  useEffect(() => {
    try {
      localStorage.setItem("docUpload:lastType", documentType);
    } catch {/* ignore */}
  }, [documentType]);

  useEffect(() => {
    try {
      localStorage.setItem("docUpload:lastTags", JSON.stringify(tags));
    } catch {/* ignore */}
  }, [tags]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    // Small delay to allow animation to complete
    setTimeout(() => {
      setFiles([]);
      setTitle("");
      setDescription("");
      setDocumentType("CARE_PLAN");
      setTags([]);
      setCurrentTag("");
      setIsEncrypted(true);
      setUploadError(null);
      setUploadSuccess(false);
      setUploadProgress(0);
    }, 200);
    onClose();
  }, [onClose]);

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Process and validate files
  const addFiles = (newFiles: File[]) => {
    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      /* ------------------------------------------------------------------
       * DEBUG: Log incoming file details to help diagnose issues where
       * file.type is unexpectedly empty / incorrect or size is NaN.
       * Remove or wrap these logs behind an environment check for
       * production if necessary.
       * ----------------------------------------------------------------- */
      // eslint-disable-next-line no-console
      console.log('File debug info:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        // eslint-disable-next-line no-console
        console.log(
          'File type not allowed:',
          file.type,
          'Allowed types:',
          ALLOWED_FILE_TYPES
        );
        errors.push(`"${file.name}" is not a supported file type`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" exceeds the maximum file size of 10MB`);
        return;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Add valid file with unique ID
      // Explicitly preserve File properties via Object.assign to ensure
      // DOM File attributes (size, name, type, etc.) remain enumerable.
      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: `file-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        preview,
        progress: 0
      });
      validFiles.push(fileWithPreview);
    });

    // Show errors if any
    if (errors.length > 0) {
      setUploadError(errors.join('. '));
      setTimeout(() => setUploadError(null), 5000);
    }

    // Add valid files to state
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      // auto-select type unless user already chose
      if (!userTouchedType) {
        setDocumentType(guessType(validFiles));
      }
      
      // Auto-fill title if it's empty and only one file is being uploaded
      if (
        !title &&
        files.length === 0 &&
        validFiles.length === 1 &&
        validFiles[0]?.name
      ) {
        const fileName = validFiles[0].name.split('.').slice(0, -1).join('.');
        setTitle(fileName);
      }
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(file => file.id !== id);
      
      // Revoke object URL for image previews to prevent memory leaks
      const fileToRemove = prev.find(file => file.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      return updatedFiles;
    });
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    // Debug logging for NaN issue
    /* eslint-disable no-console */
    console.log("formatFileSize input:", bytes, typeof bytes);
    /* eslint-enable no-console */

    // Guard against invalid values
    if (typeof bytes !== "number" || isNaN(bytes) || bytes < 0) {
      /* eslint-disable no-console */
      console.log("Invalid bytes value, returning fallback");
      /* eslint-enable no-console */
      return "Unknown size";
    }

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    // 1 GB or larger
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Handle tag input
  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim().toLowerCase())) {
      setTags(prev => [...prev, currentTag.trim().toLowerCase()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && currentTag === '') {
      // Remove the last tag when backspace is pressed in an empty input
      setTags(prev => prev.slice(0, -1));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setUploadError("Please select at least one file to upload");
      return;
    }

    if (!title.trim()) {
      setUploadError("Please enter a title for your document");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    // ------------------------------------------------------------------
    // DEBUG LOGGING
    // ------------------------------------------------------------------
    // This log will show exactly what data we are preparing to send to the
    // upload hook / API.  It helps diagnose issues such as:
    //   • Wrong / empty familyId
    //   • Incorrect title / description values
    //   • Unexpected file sizes or MIME types
    //   • Missing tags or encryption flag state
    // ------------------------------------------------------------------
    /* eslint-disable no-console */
    console.log("[DocumentUploadModal] About to submit upload with:", {
      familyId,
      title: title.trim(),
      description: description.trim(),
      documentType,
      isEncrypted,
      tags,
      filesInfo: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    });
    /* eslint-enable no-console */

    try {
      // Prepare document data
      const documents: UploadDocument[] = files.map(file => ({
        familyId,
        title: title.trim(),
        description: description.trim(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        file,
        type: documentType,
        isEncrypted,
        tags
      }));

      // Simulate file upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => 
          prev.map(file => ({
            ...file,
            progress: Math.min(file.progress + Math.random() * 20, 95)
          }))
        );
        
        // Calculate overall progress
        setUploadProgress(prev => Math.min(prev + Math.random() * 15, 95));
      }, 500);

      // Call the actual upload function
      await onUpload(documents);
      
      // Complete the progress
      clearInterval(progressInterval);
      setFiles(prev => 
        prev.map(file => ({
          ...file,
          progress: 100,
          uploaded: true
        }))
      );
      setUploadProgress(100);
      setUploadSuccess(true);
      
      // Keep success state visible briefly, then allow UI to settle
      setTimeout(() => {
        setIsUploading(false);
      }, 500);

      // Close the modal after a slightly longer delay – this prevents
      // the UI from trying to access file properties that have already
      // been cleared/reset (root cause of the "NaN MB / undefined" issue)
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload documents. Please try again.");
      setIsUploading(false);
    }
  };

  // Trigger file input click
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={isUploading ? () => {} : handleClose}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between border-b border-gray-200 pb-4"
                >
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Upload Documents
                  </h3>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={isUploading ? undefined : handleClose}
                    disabled={isUploading}
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <form ref={formRef} onSubmit={handleSubmit} className="mt-4">
                  {/* File Upload Area */}
                  <div 
                    ref={dropZoneRef}
                    className={`mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                      isDragging 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-300 hover:border-primary-400'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <FiUpload 
                        className={`h-12 w-12 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} 
                        aria-hidden="true" 
                      />
                      <p className="mt-2 text-sm text-gray-600">
                        {isDragging ? (
                          <span className="font-medium text-primary-600">Drop files here</span>
                        ) : (
                          <>
                            <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        PDF, Word, Excel, PowerPoint, Images up to 10MB
                      </p>
                      <button
                        type="button"
                        onClick={openFileDialog}
                        className="mt-4 inline-flex items-center rounded-md border border-transparent bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        disabled={isUploading}
                      >
                        <FiUpload className="mr-2 h-4 w-4" />
                        Select Files
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading}
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        aria-label="Upload files"
                      />
                    </div>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700">Selected Files</h4>
                      <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
                        {files.map((file) => (
                          <li key={file.id} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm">
                            <div className="flex w-0 flex-1 items-center">
                              {file.preview ? (
                                <div className="relative h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                                  <Image
                                    src={file.preview}
                                    alt={file.name}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <FiFile className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                              )}
                              <div className="ml-2 flex-1 truncate">
                                <p className="truncate text-gray-700">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            
                            {/* Progress or Actions */}
                            <div className="ml-4 flex flex-shrink-0 items-center space-x-2">
                              {isUploading ? (
                                <div className="w-24">
                                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                                    <div 
                                      className="h-1.5 rounded-full bg-primary-500" 
                                      style={{ width: `${file.progress}%` }}
                                    />
                                  </div>
                                  <p className="mt-1 text-right text-xs text-gray-500">{Math.round(file.progress)}%</p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                  onClick={() => removeFile(file.id)}
                                  aria-label={`Remove ${file.name}`}
                                >
                                  <FiTrash2 className="h-5 w-5" aria-hidden="true" />
                                </button>
                              )}
                              
                              {file.uploaded && (
                                <FiCheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Document Metadata */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter document title"
                        required
                        disabled={isUploading}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter optional description"
                        disabled={isUploading}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="document-type" className="block text-sm font-medium text-gray-700">
                        Document Type
                      </label>
                      <Listbox
                        value={documentType}
                        onChange={(val) => {
                          setDocumentType(val);
                          setUserTouchedType(true);
                        }}
                        disabled={isUploading}
                      >
                        <div className="relative mt-1">
                          <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm">
                            <span className="block truncate">
                              {DOCUMENT_TYPES.find(type => type.id === documentType)?.name || 'Select type'}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <FiChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {DOCUMENT_TYPES.map((type) => (
                                <Listbox.Option
                                  key={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                      active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                                    }`
                                  }
                                  value={type.id}
                                >
                                  {({ selected, active }) => (
                                    <>
                                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                        {type.name}
                                      </span>
                                      {selected && (
                                        <span
                                          className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                                            active ? 'text-primary-600' : 'text-primary-600'
                                          }`}
                                        >
                                          <FiCheckCircle className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      )}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>
                    
                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                        Tags
                      </label>
                      <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-gray-300 bg-white p-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                        {tags.map((tag) => (
                          <div 
                            key={tag} 
                            className="flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800"
                          >
                            <FiTag className="mr-1 h-3 w-3" />
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 rounded-full text-primary-600 hover:text-primary-800 focus:outline-none"
                              disabled={isUploading}
                              aria-label={`Remove tag ${tag}`}
                            >
                              <FiX className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <div className="flex-1">
                          <input
                            type="text"
                            id="tags"
                            value={currentTag}
                            onChange={(e) => setCurrentTag(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            className="w-full border-0 p-0 focus:outline-none focus:ring-0 sm:text-sm"
                            placeholder={tags.length === 0 ? "Add tags (e.g. medical, important)" : "Add another tag"}
                            disabled={isUploading}
                          />
                        </div>
                        {currentTag && (
                          <button
                            type="button"
                            onClick={addTag}
                            className="flex items-center rounded-md bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-200"
                            disabled={isUploading}
                          >
                            <FiPlus className="mr-1 h-3 w-3" />
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="encrypt"
                        name="encrypt"
                        type="checkbox"
                        checked={isEncrypted}
                        onChange={(e) => setIsEncrypted(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        disabled={isUploading}
                      />
                      <label htmlFor="encrypt" className="ml-2 flex items-center text-sm text-gray-700">
                        <FiLock className="mr-1 h-4 w-4 text-gray-500" />
                        Encrypt document for enhanced privacy
                      </label>
                    </div>
                  </div>

                  {/* Error Message */}
                  {uploadError && (
                    <div className="mt-4 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <FiAlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{uploadError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {uploadSuccess && (
                    <div className="mt-4 rounded-md bg-green-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <FiCheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            Documents uploaded successfully!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overall Progress */}
                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Uploading documents...
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                        <div 
                          className="h-2 rounded-full bg-primary-500" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      onClick={handleClose}
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      disabled={isUploading || files.length === 0}
                    >
                      {isUploading ? (
                        <>
                          <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FiUpload className="mr-2 h-4 w-4" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

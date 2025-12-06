"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { z } from "zod";
import {
  FiLoader,
  FiAlertCircle,
  FiCheck,
  FiPlus,
  FiFile,
  FiTrash2,
} from "react-icons/fi";

const credentialSchema = z
  .object({
    type: z.string().min(1, "Type is required"),
    issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Issue date must be a valid date",
    }),
    expirationDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Expiration date must be a valid date",
    }),
  })
  .refine(
    (data) => new Date(data.expirationDate) > new Date(data.issueDate),
    {
      message: "Expiration date must be after issue date",
      path: ["expirationDate"],
    }
  );

export default function CredentialsSettingsPage() {
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ type: string; text: string }>({
    type: "",
    text: "",
  });

  const [credentials, setCredentials] = useState<any[]>([]);
  const [credLoading, setCredLoading] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [newCred, setNewCred] = useState({
    type: "",
    issueDate: "",
    expirationDate: "",
    file: null as File | null,
  });
  const [credErrors, setCredErrors] = useState<any>({});

  // Get user role from session
  const userRole = session?.user?.role;

  // Determine API endpoint based on role
  const getCredentialsEndpoint = () => {
    return userRole === "PROVIDER" ? "/api/provider/credentials" : "/api/caregiver/credentials";
  };

  const fetchCredentials = useCallback(async () => {
    try {
      setCredLoading(true);
      const endpoint = getCredentialsEndpoint();
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch credentials");
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load credentials." });
    } finally {
      setCredLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (status === "authenticated" && (userRole === "CAREGIVER" || userRole === "PROVIDER")) {
      fetchCredentials();
    }
  }, [status, userRole, fetchCredentials]);

  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  const handleCredInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setNewCred((p) => ({ ...p, [name]: value }));
    if (credErrors[name]) {
      setCredErrors((prev: any) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const handleCredFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewCred((p) => ({ ...p, file }));
    if (credErrors.file) {
      setCredErrors((prev: any) => {
        const n = { ...prev };
        delete n.file;
        return n;
      });
    }
  };

  const validateCredForm = () => {
    try {
      credentialSchema.parse(newCred);
      if (!newCred.file) {
        setCredErrors({ file: "Please select a file" });
        return false;
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errs: any = {};
        err.errors.forEach((e) => (errs[e.path.join(".")] = e.message));
        setCredErrors(errs);
      }
      return false;
    }
  };

  const handleCredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredForm()) return;
    try {
      setCredSaving(true);
      let documentUrl = "";
      const baseEndpoint = userRole === "PROVIDER" ? "/api/provider/credentials" : "/api/caregiver/credentials";
      
      if (newCred.file) {
        const urlRes = await fetch(`${baseEndpoint}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: newCred.file.name,
            contentType: newCred.file.type,
          }),
        });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const urlData = await urlRes.json();
        const uploadRes = await fetch(urlData.url, {
          method: "PUT",
          headers: { "Content-Type": newCred.file.type },
          body: newCred.file,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        documentUrl = urlData.fileUrl;
      }
      const credRes = await fetch(baseEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newCred.type,
          issueDate: newCred.issueDate,
          expirationDate: newCred.expirationDate,
          documentUrl,
        }),
      });
      if (!credRes.ok) throw new Error("Failed to create credential");
      setNewCred({ type: "", issueDate: "", expirationDate: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage({ type: "success", text: "Credential added successfully!" });
      fetchCredentials();
    } catch (e) {
      setMessage({ type: "error", text: "Failed to add credential." });
    } finally {
      setCredSaving(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Delete this credential?")) return;
    try {
      const baseEndpoint = userRole === "PROVIDER" ? "/api/provider/credentials" : "/api/caregiver/credentials";
      const res = await fetch(`${baseEndpoint}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setMessage({ type: "success", text: "Credential deleted." });
      fetchCredentials();
    } catch (e) {
      setMessage({ type: "error", text: "Delete failed." });
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800">Authentication Required</h1>
          <p className="mt-2 text-neutral-600">
            Please sign in to manage your credentials.
          </p>
          <Link
            href="/auth/login?callbackUrl=/settings/credentials"
            className="mt-4 inline-block rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Credentials</h1>
        <Link
          href="/settings/profile"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Back to Profile
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
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-neutral-800">Add Credential</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Upload licenses, certifications, or other documents.
          </p>
        </div>

        <form onSubmit={handleCredSubmit} className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="type" className="block text-sm font-medium text-neutral-700">
                Credential Type
              </label>
              <input
                type="text"
                name="type"
                id="type"
                placeholder="e.g., CPR, CNA License"
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
              <input
                type="file"
                ref={fileInputRef}
                id="credFile"
                onChange={handleCredFileChange}
                className="mt-1 block w-full text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                required
              />
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
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <h2 className="text-md font-medium text-neutral-700">Your Credentials</h2>
        </div>
        {credLoading ? (
          <div className="flex justify-center py-6">
            <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : credentials.length === 0 ? (
          <p className="px-6 py-4 text-sm text-neutral-500">
            No credentials added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Expiration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
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
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {cred.documentUrl && (
                        <a
                          href={cred.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mr-3 text-primary-600 hover:text-primary-900"
                          title="View document"
                        >
                          <FiFile className="inline h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
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
  );
}

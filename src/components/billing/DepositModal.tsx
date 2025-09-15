"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  FiX,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";
import type { StripeElementsOptions } from "@stripe/stripe-js";

// Initialize Stripe outside component to avoid recreating the promise
const stripePromise = loadStripe(
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] || ""
);

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string | null;
  amountCents: number;
  onSuccess: () => void;
}

// Inner form component that uses Stripe hooks
function DepositForm({
  clientSecret,
  amountCents,
  onClose,
  onSuccess,
}: Omit<DepositModalProps, "isOpen">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  // If we're in mock mode (no clientSecret), show success immediately
  const isMockMode = !clientSecret;

  // Format amount for display
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/family?tab=billing&success=true`,
          },
          redirect: "if_required",
        });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        setIsSubmitting(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setSucceeded(true);
        // Wait a moment to show success state before closing
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  // For mock mode, just show success and provide a close button
  if (isMockMode) {
    return (
      <div className="p-6">
        <div className="mb-6 rounded-md bg-green-50 p-4 text-center">
          <FiCheckCircle
            className="mx-auto mb-2 h-10 w-10 text-green-500"
            aria-hidden="true"
          />
          <h3 className="text-lg font-medium text-green-800">
            Deposit Successful!
          </h3>
          <p className="mt-1 text-sm text-green-600">
            {formattedAmount} has been added to your wallet.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            (This is a mock transaction for development)
          </p>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="mb-4">
        <div className="mb-4 flex items-center justify-center">
          <div className="rounded-full bg-primary-100 p-3">
            <FiDollarSign className="h-6 w-6 text-primary-600" />
          </div>
        </div>
        <h3 className="text-center text-lg font-medium text-gray-900">
          Deposit {formattedAmount}
        </h3>
        <p className="mt-1 text-center text-sm text-gray-500">
          Enter your payment details below
        </p>
      </div>

      {/* Payment Element will render the credit card input */}
      <div className="mb-6">
        <PaymentElement />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle
                className="h-5 w-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {succeeded && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiCheckCircle
                className="h-5 w-5 text-green-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Payment successful! Funds will be added to your wallet shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          disabled={isSubmitting || succeeded}
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting || succeeded}
          className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <FiLoader className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </button>
      </div>
    </form>
  );
}

// Main modal component that wraps the Stripe Elements provider
export default function DepositModal({
  isOpen,
  onClose,
  clientSecret,
  amountCents,
  onSuccess,
}: DepositModalProps) {
  // Options for Stripe Elements
  const options: StripeElementsOptions | undefined = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#6366f1", // Match primary color
          },
        },
      }
    : undefined;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between border-b border-gray-200 p-4"
                >
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Deposit Funds
                  </h3>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                {/* Wrap payment form in Stripe Elements provider */}
                <Elements stripe={stripePromise} options={options}>
                  <DepositForm
                    clientSecret={clientSecret}
                    amountCents={amountCents}
                    onClose={onClose}
                    onSuccess={onSuccess}
                  />
                </Elements>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

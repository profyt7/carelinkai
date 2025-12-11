'use client';

import React from 'react';
import { FiMail, FiPhone, FiMessageCircle, FiBook, FiHelpCircle } from 'react-icons/fi';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <FiHelpCircle className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Help & Support
          </h1>
          <p className="text-lg text-gray-600">
            We're here to help you get the most out of CareLinkAI
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <FiMail className="mx-auto h-8 w-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 mb-3">
              Get help via email within 24 hours
            </p>
            <a 
              href="mailto:support@carelinkai.com" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              support@carelinkai.com
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <FiPhone className="mx-auto h-8 w-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-sm text-gray-600 mb-3">
              Talk to our support team
            </p>
            <a 
              href="tel:+18005551234" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              1-800-555-1234
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <FiMessageCircle className="mx-auto h-8 w-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-3">
              Chat with us in real-time
            </p>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Start Chat
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center mb-6">
            <FiBook className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I add a new resident?
              </h3>
              <p className="text-gray-600">
                Navigate to the Residents section and click the "Add Resident" button. 
                Fill in the required information and click "Save" to create the resident profile.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I manage caregiver assignments?
              </h3>
              <p className="text-gray-600">
                Go to the Caregivers section, select a caregiver, and navigate to the Assignments tab. 
                You can add, edit, or remove assignments from there.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I track compliance and certifications?
              </h3>
              <p className="text-gray-600">
                Each caregiver and resident profile has a Compliance/Certifications tab where you can 
                upload documents, track expiration dates, and receive automatic reminders.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I export data to Excel or CSV?
              </h3>
              <p className="text-gray-600">
                Yes! Most list views have an export button in the top right corner that allows you 
                to download data in CSV format for use in Excel or other spreadsheet applications.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I reset my password?
              </h3>
              <p className="text-gray-600">
                Click on your profile icon in the top right corner, select "Settings," then 
                navigate to the "Security" tab where you can change your password.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What browsers are supported?
              </h3>
              <p className="text-gray-600">
                CareLinkAI works best on the latest versions of Chrome, Firefox, Safari, and Edge. 
                We recommend keeping your browser updated for the best experience.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Additional Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="#" 
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
            >
              <FiBook className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">User Guide</h3>
                <p className="text-sm text-gray-600">Complete documentation</p>
              </div>
            </a>

            <a 
              href="#" 
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
            >
              <FiBook className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">Video Tutorials</h3>
                <p className="text-sm text-gray-600">Step-by-step guides</p>
              </div>
            </a>

            <a 
              href="#" 
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
            >
              <FiBook className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">API Documentation</h3>
                <p className="text-sm text-gray-600">For developers</p>
              </div>
            </a>

            <a 
              href="#" 
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
            >
              <FiBook className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">Release Notes</h3>
                <p className="text-sm text-gray-600">Latest updates</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

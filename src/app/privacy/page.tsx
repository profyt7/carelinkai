import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft, FiLock, FiShield } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Privacy Policy | CareLinkAI",
  description: "Privacy Policy for CareLinkAI - Learn how we collect, use, and protect your personal information",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center text-slate-600 hover:text-[#3978FC] transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center text-[#3978FC]">
            <FiLock className="mr-2" />
            <span className="text-sm font-medium">Privacy Document</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#7253B7]/10 rounded-full mb-4">
              <FiShield className="w-8 h-8 text-[#7253B7]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Privacy Policy
            </h1>
            <p className="text-slate-500">
              Last Updated: January 26, 2026
            </p>
          </div>

          {/* HIPAA Compliance Badge */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-10 flex items-center justify-center">
            <FiShield className="text-green-600 mr-3 w-6 h-6" />
            <span className="text-green-800 font-medium">
              HIPAA Compliant • SOC 2 Certified • GDPR & CCPA Aware
            </span>
          </div>

          {/* Content Sections */}
          <div className="prose prose-slate max-w-none">
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                Introduction
              </h2>
              <p className="text-slate-600 leading-relaxed">
                CareLinkAI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy and ensuring the 
                security of your personal information. This Privacy Policy explains how we collect, use, disclose, 
                and safeguard your information when you use our AI-powered senior care placement platform. 
                Please read this policy carefully to understand our practices regarding your data.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                Information We Collect
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We collect information in several ways:
              </p>
              
              <h3 className="text-lg font-medium text-slate-800 mt-6 mb-3">Information You Provide</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
                <li><strong>Profile Information:</strong> Role (family member, operator), preferences, contact details</li>
                <li><strong>Care Requirements:</strong> Health conditions, care needs, budget, location preferences</li>
                <li><strong>Communication Data:</strong> Messages, inquiries, tour requests, feedback</li>
                <li><strong>Payment Information:</strong> Billing details processed through secure payment providers</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mt-6 mb-3">Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
                <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                <li><strong>Cookies:</strong> Session data, preferences, authentication tokens</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mt-6 mb-3">Sensitive Health Information</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  <strong>Protected Health Information (PHI):</strong> We may collect health-related information 
                  necessary to match families with appropriate care facilities. This information is handled in 
                  compliance with HIPAA regulations and is only shared with your explicit consent.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                How We Use Your Information
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We use collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Service Delivery:</strong> To provide AI-powered care matching and recommendations</li>
                <li><strong>Communication:</strong> To facilitate messaging between families and care providers</li>
                <li><strong>Account Management:</strong> To create, maintain, and secure your account</li>
                <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our services</li>
                <li><strong>Customer Support:</strong> To respond to inquiries and resolve issues</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                <li><strong>Safety & Security:</strong> To detect and prevent fraud or abuse</li>
                <li><strong>Marketing:</strong> To send relevant updates and promotions (with your consent)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                Information Sharing
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Care Providers:</strong> When you express interest in a facility or request a tour</li>
                <li><strong>Service Providers:</strong> Third parties who assist with payment processing, analytics, and hosting</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-amber-800 text-sm">
                  <strong>Important:</strong> We never share your health information with care providers without 
                  your explicit consent. You control what information is shared during the matching process.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">5</span>
                Data Security
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We implement robust security measures to protect your information:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Encryption:</strong> TLS/SSL encryption for all data in transit; AES-256 for data at rest</li>
                <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
                <li><strong>Monitoring:</strong> Continuous security monitoring and intrusion detection</li>
                <li><strong>Audits:</strong> Regular security assessments and penetration testing</li>
                <li><strong>Training:</strong> Employee security awareness training</li>
                <li><strong>Compliance:</strong> SOC 2 Type II certified; HIPAA compliant infrastructure</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">6</span>
                Your Rights & Choices
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Depending on your location, you may have the following rights:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Access & Portability</h4>
                  <p className="text-slate-600 text-sm">Request a copy of your personal data in a portable format</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Correction</h4>
                  <p className="text-slate-600 text-sm">Request correction of inaccurate personal information</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Deletion</h4>
                  <p className="text-slate-600 text-sm">Request deletion of your personal data (subject to legal requirements)</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Opt-Out</h4>
                  <p className="text-slate-600 text-sm">Opt-out of marketing communications at any time</p>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@getcarelinkai.com" className="text-[#7253B7] hover:underline">privacy@getcarelinkai.com</a>.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">7</span>
                Cookies & Tracking Technologies
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for basic platform functionality and security</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertising (with consent)</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                You can manage cookie preferences through your browser settings or our cookie consent banner.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">8</span>
                Third-Party Services
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Our platform may integrate with third-party services for payment processing, analytics, and 
                communication. These services have their own privacy policies, and we encourage you to review 
                them. We only work with service providers who maintain appropriate security standards and 
                contractually agree to protect your data.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">9</span>
                Children&apos;s Privacy
              </h2>
              <p className="text-slate-600 leading-relaxed">
                CareLinkAI is not intended for use by individuals under the age of 18. We do not knowingly 
                collect personal information from children. If you believe we have inadvertently collected 
                information from a minor, please contact us immediately so we can delete it.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">10</span>
                Data Retention
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and 
                fulfill the purposes described in this policy. When data is no longer needed, we securely 
                delete or anonymize it. Certain information may be retained longer as required by law or 
                for legitimate business purposes such as audit trails and legal compliance.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">11</span>
                International Data Transfers
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place for international transfers, including 
                standard contractual clauses and data processing agreements that comply with applicable 
                data protection laws.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">12</span>
                California Privacy Rights (CCPA)
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                California residents have additional rights under the California Consumer Privacy Act:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                <strong>We do not sell your personal information.</strong>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">13</span>
                Changes to This Policy
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this Privacy Policy periodically to reflect changes in our practices or 
                applicable laws. We will notify you of material changes by posting the updated policy 
                on our platform and updating the &quot;Last Updated&quot; date. We encourage you to review this 
                policy regularly.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#7253B7] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">14</span>
                Contact Us
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <p className="text-slate-900 font-semibold mb-2">CareLinkAI Privacy Team</p>
                <p className="text-slate-600">Email: privacy@getcarelinkai.com</p>
                <p className="text-slate-600">Phone: 1-800-555-1234</p>
                <p className="text-slate-600">Address: San Francisco, CA, United States</p>
              </div>
              <p className="text-slate-600 leading-relaxed mt-4">
                For HIPAA-related inquiries, please contact our HIPAA Compliance Officer at 
                <a href="mailto:hipaa@getcarelinkai.com" className="text-[#7253B7] hover:underline ml-1">hipaa@getcarelinkai.com</a>.
              </p>
            </section>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 mb-4">Related Documents</p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/terms" 
              className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-[#7253B7] hover:text-[#7253B7] transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              href="/contact" 
              className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-[#7253B7] hover:text-[#7253B7] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

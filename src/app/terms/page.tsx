import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft, FiShield, FiFileText } from "react-icons/fi";

export const metadata: Metadata = {
  title: "Terms of Service | CareLinkAI",
  description: "Terms of Service for CareLinkAI - AI-powered senior care placement platform",
};

export default function TermsOfServicePage() {
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
            <FiShield className="mr-2" />
            <span className="text-sm font-medium">Legal Document</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3978FC]/10 rounded-full mb-4">
              <FiFileText className="w-8 h-8 text-[#3978FC]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Terms of Service
            </h1>
            <p className="text-slate-500">
              Last Updated: January 26, 2026
            </p>
          </div>

          {/* Content Sections */}
          <div className="prose prose-slate max-w-none">
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                Acceptance of Terms
              </h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using CareLinkAI (&quot;the Service&quot;), you agree to be bound by these Terms of Service 
                (&quot;Terms&quot;). If you do not agree to all the terms and conditions, you may not access or use the Service. 
                These Terms apply to all visitors, users, and others who access or use the Service, including families 
                seeking senior care placement, assisted living facility operators, and healthcare professionals.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                Description of Service
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                CareLinkAI is an AI-powered platform that connects families with assisted living facilities, memory care 
                communities, and senior care providers. Our Service includes:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>AI-powered matching algorithms to recommend suitable care facilities</li>
                <li>Communication tools for families and care providers</li>
                <li>Virtual and in-person tour scheduling capabilities</li>
                <li>Resident care management tools for operators</li>
                <li>Family portal for care updates and communication</li>
                <li>Document management and secure file sharing</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                User Accounts
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                To access certain features of the Service, you must create an account. When creating your account, 
                you agree to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password confidential and secure</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, 
                abusive, or illegal activity.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                Use of Service
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. 
                You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any local, state, national, or international law</li>
                <li>Harass, abuse, or harm another person or entity</li>
                <li>Submit false, misleading, or inaccurate information</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Use automated systems (bots, scrapers) without permission</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Impersonate any person or entity</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">5</span>
                Healthcare Disclaimer
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 font-medium mb-2">Important Notice</p>
                <p className="text-amber-700 text-sm">
                  CareLinkAI is NOT a healthcare provider and does NOT provide medical advice, diagnosis, or treatment.
                </p>
              </div>
              <p className="text-slate-600 leading-relaxed">
                The Service is designed to facilitate connections between families and senior care providers. 
                Information provided through the Service is for informational purposes only and should not be 
                considered medical advice. Always consult with qualified healthcare professionals for medical 
                decisions. CareLinkAI does not guarantee the quality, safety, or suitability of any care facility 
                listed on the platform.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">6</span>
                Privacy
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Your privacy is important to us. Our collection, use, and protection of your personal information 
                is governed by our <Link href="/privacy" className="text-[#3978FC] hover:underline">Privacy Policy</Link>, 
                which is incorporated into these Terms by reference. By using the Service, you consent to the 
                collection and use of information as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">7</span>
                Intellectual Property
              </h2>
              <p className="text-slate-600 leading-relaxed">
                The Service and its original content, features, and functionality are owned by CareLinkAI and are 
                protected by international copyright, trademark, patent, trade secret, and other intellectual 
                property laws. You may not copy, modify, distribute, sell, or lease any part of our Service or 
                included software without our express written permission.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">8</span>
                Third-Party Services
              </h2>
              <p className="text-slate-600 leading-relaxed">
                The Service may contain links to third-party websites, services, or resources. We are not responsible 
                for the content, accuracy, or practices of any third-party sites. Your use of third-party services 
                is at your own risk and subject to their respective terms and policies.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">9</span>
                Disclaimers
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Implied warranties of merchantability</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy or completeness of information</li>
                <li>Availability or reliability of the Service</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">10</span>
                Limitation of Liability
              </h2>
              <p className="text-slate-600 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CARELINKAI SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF 
                PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR 
                USE OF THE SERVICE. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNTS PAID BY YOU TO 
                US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">11</span>
                Indemnification
              </h2>
              <p className="text-slate-600 leading-relaxed">
                You agree to defend, indemnify, and hold harmless CareLinkAI, its officers, directors, employees, 
                and agents from any claims, damages, obligations, losses, liabilities, costs, or expenses arising 
                from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any 
                third-party rights; or (d) any content you submit to the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">12</span>
                Termination
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without prior 
                notice or liability, for any reason, including breach of these Terms. Upon termination, your 
                right to use the Service will cease immediately. All provisions of these Terms that should 
                survive termination shall survive, including ownership provisions, warranty disclaimers, 
                indemnity, and limitations of liability.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">13</span>
                Governing Law
              </h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of 
                California, United States, without regard to its conflict of law provisions. Any disputes 
                arising from these Terms or the Service shall be resolved in the state or federal courts 
                located in San Francisco County, California.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">14</span>
                Changes to Terms
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time at our sole discretion. 
                If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms 
                taking effect. What constitutes a material change will be determined at our sole discretion. 
                Your continued use of the Service after changes become effective constitutes acceptance of the 
                revised Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#3978FC] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">15</span>
                Contact Us
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <p className="text-slate-900 font-semibold mb-2">CareLinkAI Legal Department</p>
                <p className="text-slate-600">Email: legal@getcarelinkai.com</p>
                <p className="text-slate-600">Phone: 1-800-555-1234</p>
                <p className="text-slate-600">Address: San Francisco, CA, United States</p>
              </div>
            </section>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 mb-4">Related Documents</p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/privacy" 
              className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-[#3978FC] hover:text-[#3978FC] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/contact" 
              className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-[#3978FC] hover:text-[#3978FC] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

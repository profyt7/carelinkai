import Link from "next/link";
import Image from "next/image";
import { FiArrowRight, FiCheck, FiShield, FiUsers, FiHeart, FiActivity, FiSearch } from "react-icons/fi";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-neutral-200 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-md bg-primary-500 flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-neutral-800 font-semibold text-xl">CareLinkAI</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-neutral-600 hover:text-primary-600 font-medium">
              Features
            </Link>
            <Link href="#how-it-works" className="text-neutral-600 hover:text-primary-600 font-medium">
              How It Works
            </Link>
            <Link href="#pricing" className="text-neutral-600 hover:text-primary-600 font-medium">
              Pricing
            </Link>
            <Link href="#testimonials" className="text-neutral-600 hover:text-primary-600 font-medium">
              Testimonials
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/auth/login" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Log in
            </Link>
            <Link 
              href="/auth/register" 
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-800 leading-tight">
                Connecting Families, Homes, and Caregivers
              </h1>
              <p className="mt-6 text-xl text-neutral-600 max-w-lg">
                CareLinkAI is a HIPAA-compliant platform that uses AI to match families with the perfect assisted living homes and caregivers.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link 
                  href="/auth/login" 
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium text-center flex items-center justify-center"
                >
                  Get Started
                  <FiArrowRight className="ml-2" />
                </Link>
                <Link 
                  href="/search" 
                  className="bg-white hover:bg-neutral-100 text-neutral-800 px-6 py-3 rounded-md font-medium border border-neutral-300 text-center flex items-center justify-center"
                >
                  <FiSearch className="mr-2" />
                  Search Homes
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative h-96 w-full">
                <div className="absolute top-0 right-0 w-5/6 h-full bg-white rounded-lg shadow-xl overflow-hidden">
                  <Image 
                    src="/images/hero-dashboard.jpg" 
                    alt="CareLinkAI Dashboard" 
                    width={600} 
                    height={400}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute bottom-0 left-0 w-2/3 bg-white p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                      <FiHeart className="text-primary-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-800">Perfect Match Found</h3>
                      <p className="text-sm text-neutral-500">Sunshine Valley Care Home - 98% match</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <p className="text-neutral-500 font-medium mb-8">Trusted by leading healthcare organizations</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-70">
            <div className="h-12 w-32 bg-neutral-200 rounded"></div>
            <div className="h-12 w-32 bg-neutral-200 rounded"></div>
            <div className="h-12 w-32 bg-neutral-200 rounded"></div>
            <div className="h-12 w-32 bg-neutral-200 rounded"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-800">Why Choose CareLinkAI?</h2>
            <p className="mt-4 text-xl text-neutral-600 max-w-2xl mx-auto">
              Our platform offers unique features designed to streamline the care placement process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <FiActivity className="text-primary-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-4">AI-Powered Matching</h3>
              <p className="text-neutral-600">
                Our proprietary algorithm analyzes over 50 data points to find the perfect assisted living match for your loved one's unique needs.
              </p>
              <ul className="mt-6 space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Personalized care recommendations</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Matches based on medical needs</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Location and budget optimization</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <FiShield className="text-primary-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-4">HIPAA-Compliant Security</h3>
              <p className="text-neutral-600">
                Your sensitive health information is protected with enterprise-grade security and full HIPAA compliance at every level.
              </p>
              <ul className="mt-6 space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">End-to-end encryption</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Secure document sharing</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Comprehensive audit logging</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <FiUsers className="text-primary-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-4">Comprehensive Care Management</h3>
              <p className="text-neutral-600">
                A complete suite of tools for assisted living operators to manage residents, staff, and operations efficiently.
              </p>
              <ul className="mt-6 space-y-2">
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Resident health tracking</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Staff scheduling and management</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-primary-600 mt-1 mr-2" />
                  <span className="text-neutral-600">Family communication portal</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to find the perfect care solution?</h2>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-8">
            Join thousands of families who have found their ideal assisted living match through CareLinkAI.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              href="/auth/login" 
              className="bg-white hover:bg-neutral-100 text-primary-600 px-6 py-3 rounded-md font-medium text-center"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/register" 
              className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-md font-medium text-center"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-800 text-neutral-300 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-md bg-primary-500 flex items-center justify-center mr-2">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-white font-semibold text-xl">CareLinkAI</span>
              </div>
              <p className="text-neutral-400">
                Connecting families with the perfect assisted living homes through our AI-powered matching platform.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white">Features</Link></li>
                <li><Link href="#" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Case Studies</Link></li>
                <li><Link href="#" className="hover:text-white">Reviews</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
                <li><Link href="#" className="hover:text-white">Partners</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p>© {new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link href="#" className="hover:text-white">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link href="#" className="hover:text-white">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

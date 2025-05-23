import React from 'react';

const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Terms of Service</h1>
      
      <p className="text-gray-700 mb-6">
        These Terms of Service govern your use of our website and services. By accessing or using our services, 
        you agree to comply with and be bound by these terms.
      </p>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Use of Our Services</h2>
        <p className="text-gray-700">
          You agree to use our website and services only for lawful purposes. You may not use our services 
          in any way that could damage, disable, or impair the website.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Account Responsibilities</h2>
        <p className="text-gray-700">
          You are responsible for maintaining the confidentiality of your account and password and for all 
          activities that occur under your account.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Termination</h2>
        <p className="text-gray-700">
          We reserve the right to suspend or terminate your access to our services at any time for 
          violations of these terms.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Limitation of Liability</h2>
        <p className="text-gray-700">
          We are not liable for any direct, indirect, incidental, or consequential damages arising from 
          your use of our services.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Changes to Terms</h2>
        <p className="text-gray-700">
          We may revise these terms from time to time. You will be notified of any changes by the 
          publication of updated terms on our website.
        </p>
      </section>
      
      <div className="mt-8 text-sm text-gray-500 text-center">
        Last updated: May 1, 2025
      </div>
    </div>
  );
};

export default TermsOfService;
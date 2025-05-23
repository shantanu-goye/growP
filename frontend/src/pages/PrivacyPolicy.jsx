import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Privacy Policy</h1>
      
      <p className="text-gray-700 mb-6">
        This Privacy Policy describes how we collect, use, and protect your personal information when you 
        use our services. By using our website, you agree to the collection and use of information in 
        accordance with this policy.
      </p>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Information Collection</h2>
        <p className="text-gray-700">
          We collect information such as your name, email address, and usage data to improve our service. 
          We may also collect cookies for analytics purposes.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">How We Use Your Information</h2>
        <p className="text-gray-700">
          Your personal information is used to improve our services, provide customer support, and send 
          promotional emails (if you opt-in).
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Data Security</h2>
        <p className="text-gray-700">
          We take reasonable steps to protect your data from unauthorized access, disclosure, or destruction.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Your Rights</h2>
        <p className="text-gray-700">
          You have the right to access, update, and delete your personal data at any time. If you wish to 
          exercise these rights, please contact us at <a href="mailto:privacy@example.com" className="text-blue-600 hover:underline">privacy@example.com</a>.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Changes to This Policy</h2>
        <p className="text-gray-700">
          We may update this privacy policy from time to time. We will notify you of any changes by posting 
          the new policy on our website.
        </p>
      </section>
      
      <div className="mt-8 text-sm text-gray-500 text-center">
        Last updated: May 1, 2025
      </div>
    </div>
  );
};

export default PrivacyPolicy;
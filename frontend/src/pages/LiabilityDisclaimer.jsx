import React from 'react';

const LiabilityDisclaimer = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Liability Disclaimer</h1>
      
      <p className="text-gray-700 mb-6">
        By using our services, you acknowledge and agree to the following terms regarding liability.
      </p>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No Liability for Damages</h2>
        <p className="text-gray-700">
          We are not liable for any damages, losses, or expenses incurred due to the use of our website 
          or services. This includes, but is not limited to, data loss, business interruption, or personal injury.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Third-Party Links</h2>
        <p className="text-gray-700">
          Our website may contain links to third-party websites. We are not responsible for the content 
          or privacy practices of these external sites.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Indemnification</h2>
        <p className="text-gray-700">
          You agree to indemnify and hold us harmless from any claims, losses, or damages arising out of 
          your use of our services or violation of these terms.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Changes to the Disclaimer</h2>
        <p className="text-gray-700">
          We may update this liability disclaimer from time to time. Please review it periodically for any changes.
        </p>
      </section>
      
      <div className="mt-8 text-sm text-gray-500 text-center">
        Last updated: May 1, 2025
      </div>
    </div>
  );
};

export default LiabilityDisclaimer;
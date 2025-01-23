import React from 'react';

const AboutUs = () => {
  return (
    <>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">RubricXpert</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/about" className="text-gray-600 hover:text-blue-600">About Us</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Contact Us</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">About RubricXpert</h1>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-lg text-gray-700 mb-6">
              RubricXpert is an innovative AI-powered platform designed to help students and educators 
              streamline the essay evaluation process through automated rubric-based assessment.
            </p>
            <p className="text-lg text-gray-700 mb-6">
              Our mission is to provide accurate, consistent, and timely feedback that helps improve 
              writing quality and academic performance.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
                <p className="text-gray-700">
                  To revolutionize academic writing assessment through cutting-edge AI technology 
                  while maintaining the nuanced understanding of human evaluation.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-4">Our Team</h2>
                <p className="text-gray-700">
                  We are a dedicated group of educators, developers, and AI specialists committed 
                  to improving educational outcomes through technology.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutUs;
import React from 'react';

const BookingDetail: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            Pending
          </span>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Service Type</span>
                  <p className="font-medium text-gray-900">Home Cleaning</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date</span>
                  <p className="font-medium text-gray-900">March 15, 2026</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Time</span>
                  <p className="font-medium text-gray-900">10:00 AM - 12:00 PM</p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Artisan</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-lg">👤</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">John Smith</p>
                  <p className="text-sm text-gray-500">Professional Cleaner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <p className="text-gray-700">123 Main Street, Apt 4B</p>
          <p className="text-gray-700">New York, NY 10001</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee</span>
              <span className="font-medium">$80.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee</span>
              <span className="font-medium">$5.00</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">$85.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetail;

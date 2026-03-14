import React, { useState } from "react";
import { bookingApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const BookingCreate: React.FC = () => {
  // const { artisanId } = useParams(); // get artisan from URL
  // console.log("Artisan ID:", artisanId)
;
  const [serviceDescription, setServiceDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  // const [selectedService, setSelectedService] = useState<string>("");
  // const [price, setPrice] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();

  const artisanId = location.state?.artisanId;

  console.log("Artisan ID:", artisanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = {
        artisan: artisanId,
        serviceCategory: location.state?.serviceCategory,
        serviceDescription,
        address: {
          street: streetAddress,
          city: city,
          state: state
        },
        scheduledDate,
        scheduledTime,
        estimatedDuration: 1
      };

      const response = await bookingApi.create(formData);
      console.log("Booking Response:", response);

      if (response.success) {
        setBookingSuccess(true);

        setServiceDescription("");
        setScheduledDate("");
        setScheduledTime("");
        setStreetAddress("");
        setCity("");
        setState("");
        // setPrice("");

        setTimeout(() => {
          navigate("/dashboard/bookings");
        }, 2000);
      }

    } catch (error) {
      console.error(error);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Booking Successful!</h2>

            <p className="text-gray-600 mb-4">
              Your booking has been sent to the artisan.
              <br />
              Redirecting to your bookings...
            </p>

          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">

      <div className="max-w-2xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">Create Booking</h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">

          <div>
            <label className="block text-sm font-medium">Service Description</label>
            <textarea
              className="w-full border rounded p-2"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Time</label>
            <input
              type="time"
              className="w-full border rounded p-2"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Street Address</label>
            <input
              className="w-full border rounded p-2"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              className="w-full border rounded p-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">State</label>
            <input
              className="w-full border rounded p-2"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium">Price</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div> */}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Confirm Booking
          </button>

        </form>

      </div>

    </div>
  );
};

export default BookingCreate;











// import React, { useState } from "react";
// import { bookingApi } from "@/services/api";
// import { Card, CardContent } from "@/components/ui/card";
// import { CheckCircle } from "lucide-react";
// import { useNavigate } from "react-router-dom";

// const BookingCreate: React.FC = () => {
//   const [serviceDescription, setServiceDescription] = useState("");
//   const [scheduledDate, setScheduledDate] = useState("");
//   const [scheduledTime, setScheduledTime] = useState("");
//   const [street, setStreet] = useState("");
//   const [city, setCity] = useState("");
//   const [state, setState] = useState("");
//   const [price, setPrice] = useState("");
//   const [bookingSuccess, setBookingSuccess] = useState(false);
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
  
//     const formData = {
//       serviceDescription,
//       date: scheduledDate,
//       time: scheduledTime,
//       street,
//       city,
//       state,
//       price,
//     };
  
//     try {
//       const response = await bookingApi.create(formData);
  
//       if (response.success) {
//         setBookingSuccess(true);
  
//         setServiceDescription("");
//         setScheduledDate("");
//         setScheduledTime("");
//         setStreet("");
//         setCity("");
//         setState("");
//         setPrice("");
  
//         setTimeout(() => {
//           navigate("/dashboard/bookings");
//         }, 2000);
//       }
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   if (bookingSuccess) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
//         <Card className="max-w-md w-full text-center">
//           <CardContent className="pt-6">
//             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <CheckCircle className="h-8 w-8 text-green-600" />
//             </div>
//             <h2 className="text-2xl font-bold mb-2">Booking Successful!</h2>
//             <p className="text-gray-600 mb-4">
//             Your booking has been sent to the artisan. <br />
//             Redirecting you to your bookings...
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }
//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4">
//       <div className="max-w-2xl mx-auto">

//         <h1 className="text-3xl font-bold mb-6">Create Booking</h1>

//         <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">

//           <div>
//             <label className="block text-sm font-medium">Service Description</label>
//             <textarea
//               className="w-full border rounded p-2"
//               value={serviceDescription}
//               onChange={(e) => setServiceDescription(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">Date</label>
//             <input
//               type="date"
//               className="w-full border rounded p-2"
//               value={scheduledDate}
//               onChange={(e) => setScheduledDate(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">Time</label>
//             <input
//               type="time"
//               className="w-full border rounded p-2"
//               value={scheduledTime}
//               onChange={(e) => setScheduledTime(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">Street</label>
//             <input
//               className="w-full border rounded p-2"
//               value={street}
//               onChange={(e) => setStreet(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">City</label>
//             <input
//               className="w-full border rounded p-2"
//               value={city}
//               onChange={(e) => setCity(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">State</label>
//             <input
//               className="w-full border rounded p-2"
//               value={state}
//               onChange={(e) => setState(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">Price</label>
//             <input
//               type="number"
//               className="w-full border rounded p-2"
//               value={price}
//               onChange={(e) => setPrice(e.target.value)}
//             />
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded"
//           >
//             Confirm Booking
//           </button>

//         </form>
//       </div>
//     </div>
//   );
// };

// export default BookingCreate;
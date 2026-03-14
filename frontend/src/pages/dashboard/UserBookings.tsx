import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bookingApi } from "@/services/api";
import type { Booking } from "@/types";

export default function UserBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await bookingApi.getMyBookings();

      if (response?.data?.success) {
        const bookingsData = response?.data?.data || [];
        setBookings(bookingsData);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (booking: Booking) => {
    try {
      const response = await bookingApi.initializePayment(booking._id);

      if (response.success) {
        window.location.href = response.data.authorization_url;
      }
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return variants[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-gray-500">View and manage all your bookings</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">No bookings yet</p>

            <Link to="/artisans">
              <Button>Find an Artisan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Link key={booking._id} to={`/bookings/${booking._id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Artisan Info */}
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          booking?.artisan?.user?.profileImage ||
                          "/default-avatar.png"
                        }
                        alt={booking?.artisan?.user?.firstName || "Artisan"}
                        className="h-16 w-16 rounded-full object-cover"
                      />

                      <div>
                        <p className="font-semibold text-lg">
                          {booking?.artisan?.user?.firstName}{" "}
                          {booking?.artisan?.user?.lastName}
                        </p>

                        <p className="text-gray-500">
                          {booking?.serviceCategory?.name}
                        </p>

                        <p className="text-sm text-gray-400">
                          {new Date(
                            booking?.scheduledDate
                          ).toLocaleDateString()}{" "}
                          at {booking?.scheduledTime}
                        </p>
                      </div>
                    </div>

                    {/* Status + Price */}
                    <div className="text-right">
                      <Badge className={getStatusBadge(booking.status)}>
                        {booking.status}
                      </Badge>

                      <p className="text-lg font-semibold mt-2">
                        ₦
                        {(
                          (booking?.price?.totalAmount || 0) / 100
                        ).toLocaleString()}
                      </p>

                      <p className="text-sm text-gray-500">
                        {booking.bookingNumber}
                      </p>

                      {booking.status === "accepted" && (
                        <Button
                          className="mt-3 w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePayment(booking);
                          }}
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}











// import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { Card, CardContent } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { bookingApi } from '@/services/api';
// import type { Booking } from '@/types';
// import { usePaystackPayment } from "react-paystack";

// export default function UserBookings() {
//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     loadBookings();
//   }, []);

//   const loadBookings = async () => {
//     try {
//       const response = await bookingApi.getAll();
//       if (response.success) {
//         setBookings(response.data.data);
//       }
//     } catch (error) {
//       console.error('Error loading bookings:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePayment = (booking: Booking) => {
//     const config = {
//       reference: new Date().getTime().toString(),
//       email: booking.user.email,
//       amount: booking.price.totalAmount,
//       publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
//     };
  
//     const initializePayment = usePaystackPayment(config);
  
//     initializePayment(
//       () => {
//         console.log("Payment successful");
//       },
//       () => {
//         console.log("Payment closed");
//       }
//     );
//   };

//   const getStatusBadge = (status: string) => {
//     const variants: Record<string, string> = {
//       pending: 'bg-yellow-100 text-yellow-800',
//       accepted: 'bg-blue-100 text-blue-800',
//       in_progress: 'bg-purple-100 text-purple-800',
//       completed: 'bg-green-100 text-green-800',
//       cancelled: 'bg-red-100 text-red-800',
//     };
//     return variants[status] || 'bg-gray-100 text-gray-800';
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold">My Bookings</h1>
//         <p className="text-gray-500">View and manage all your bookings</p>
//       </div>

//       {bookings.length === 0 ? (
//         <Card>
//           <CardContent className="p-8 text-center">
//             <p className="text-gray-500 mb-4">No bookings yet</p>
//             <Link to="/artisans">
//               <Button>Find an Artisan</Button>
//             </Link>
//           </CardContent>
//         </Card>
//       ) : (
//         <div className="space-y-4">
//           {bookings.map((booking) => (
//             <Link key={booking._id} to={`/bookings/${booking._id}`}>
//               <Card className="hover:shadow-md transition-shadow">
//                 <CardContent className="p-6">
//                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                     <div className="flex items-center gap-4">
//                       <img
//                         src={booking.artisan.user.profileImage || '/default-avatar.png'}
//                         alt={booking.artisan.user.firstName}
//                         className="h-16 w-16 rounded-full object-cover"
//                       />
//                       <div>
//                         <p className="font-semibold text-lg">
//                           {booking.artisan.user.firstName} {booking.artisan.user.lastName}
//                         </p>
//                         <p className="text-gray-500">{booking.serviceCategory.name}</p>
//                         <p className="text-sm text-gray-400">
//                           {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
//                         </p>
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <Badge className={getStatusBadge(booking.status)}>
//                         {booking.status}
//                       </Badge>
//                       <p className="text-lg font-semibold mt-2">
//                         ₦{(booking.price.totalAmount / 100).toLocaleString()}
//                       </p>
//                       <p className="text-sm text-gray-500">{booking.bookingNumber}</p>
//                       {booking.status === "accepted" && (
//                         <Button
//                           className="mt-3 w-full"
//                           onClick={(e) => {
//                             e.preventDefault();
//                             handlePayment(booking);
//                           }}
//                         >
//                           Pay Now
//                         </Button>
//                       )}
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </Link>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { artisanApi } from '@/services/api';
import type { Booking } from '@/types';

export default function ArtisanBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await artisanApi.getBookings();
      if (response.success) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }


  const updateBookingStatus = async (id: string, status: string) => {
    try {
      await artisanApi.updateBookingStatus(id, { status });
  
      // reload bookings
      loadBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-gray-500">Manage your booking requests</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No bookings yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking._id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{booking.user.firstName} {booking.user.lastName}</p>
                    <p className="text-gray-500">{booking.serviceCategory.name}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusBadge(booking.status)}>
                      {booking.status}
                    </Badge> 

                    <p className="text-lg font-semibold mt-2">
                      ₦{(booking.price.totalAmount / 100).toLocaleString()}
                    </p>

                    {booking.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateBookingStatus(booking._id, "accepted")}
                        >
                          Accept
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateBookingStatus(booking._id, "cancelled")}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

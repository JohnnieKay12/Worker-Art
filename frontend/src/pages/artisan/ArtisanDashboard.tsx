import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Star, DollarSign, Briefcase } from 'lucide-react';
import { artisanApi } from '@/services/api';
import type { ArtisanDashboard as ArtisanDashboardType } from '@/types';

export default function ArtisanDashboard() {
  const [dashboard, setDashboard] = useState<ArtisanDashboardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await artisanApi.getDashboard();
      if (response.success) {
        setDashboard(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
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
        <h1 className="text-2xl font-bold">Artisan Dashboard</h1>
        <p className="text-gray-500">Manage your bookings and profile</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold">{dashboard?.stats.totalBookings || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">{dashboard?.stats.completedBookings || 0}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-2xl font-bold">{dashboard?.artisan.rating.average.toFixed(1) || 0}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Earnings</p>
                <p className="text-2xl font-bold">
                  ₦{((dashboard?.stats.totalEarnings || 0) / 100).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Recent Bookings</h3>
            <Link to="/artisan/dashboard/bookings">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {dashboard?.recentBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {dashboard?.recentBookings.slice(0, 3).map((booking) => (
                <div key={booking._id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{booking.user.firstName} {booking.user.lastName}</p>
                    <p className="text-sm text-gray-500">{booking.serviceCategory.name}</p>
                  </div>
                  <Badge>{booking.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

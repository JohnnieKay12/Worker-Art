import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Briefcase, Calendar, CreditCard, Star, TrendingUp } from 'lucide-react';
import { adminApi } from '@/services/api';
import type { AdminDashboard as AdminDashboardType } from '@/types';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await adminApi.getDashboard();
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
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500">Overview of platform activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Users</p>
                <p className="text-2xl font-bold">{dashboard?.counts.users || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Artisans</p>
                <p className="text-2xl font-bold">{dashboard?.counts.artisans || 0}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{dashboard?.counts.pendingArtisans || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bookings</p>
                <p className="text-2xl font-bold">{dashboard?.counts.bookings || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Payments</p>
                <p className="text-2xl font-bold">{dashboard?.counts.payments || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reviews</p>
                <p className="text-2xl font-bold">{dashboard?.counts.reviews || 0}</p>
              </div>
              <Star className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold">
                ₦{((dashboard?.revenue.totalRevenue || 0) / 100).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-xl font-semibold">{dashboard?.revenue.totalTransactions || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Recent Bookings</h3>
            {dashboard?.recentBookings.length === 0 ? (
              <p className="text-gray-500">No recent bookings</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentBookings.slice(0, 5).map((booking) => (
                  <div key={booking._id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{booking.bookingNumber}</p>
                      <p className="text-sm text-gray-500">{booking.status}</p>
                    </div>
                    <p className="font-semibold">₦{(booking.price.totalAmount / 100).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Recent Users</h3>
            {dashboard?.recentUsers.length === 0 ? (
              <p className="text-gray-500">No recent users</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 border rounded">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

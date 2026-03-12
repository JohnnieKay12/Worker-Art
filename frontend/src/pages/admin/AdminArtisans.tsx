import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { adminApi } from '@/services/api';
import type { Artisan } from '@/types';

export default function AdminArtisans() {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadArtisans();
  }, []);

  const loadArtisans = async () => {
    try {
      const response = await adminApi.getArtisans();
      if (response.success) {
        setArtisans(response.data);
      }
    } catch (error) {
      console.error('Error loading artisans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveArtisan(id);
      loadArtisans();
    } catch (error) {
      console.error('Error approving artisan:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminApi.rejectArtisan(id, 'Not qualified');
      loadArtisans();
    } catch (error) {
      console.error('Error rejecting artisan:', error);
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
        <h1 className="text-2xl font-bold">Artisans</h1>
        <p className="text-gray-500">Manage artisan applications</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artisan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {artisans.map((artisan) => (
                  <tr key={artisan._id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={artisan.user.profileImage || '/default-avatar.png'}
                          alt={artisan.user.firstName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{artisan.user.firstName} {artisan.user.lastName}</p>
                          <p className="text-sm text-gray-500">{artisan.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {artisan.skills.map((skill) => (
                          <Badge key={skill._id} variant="outline" className="text-xs">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          artisan.approvalStatus === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : artisan.approvalStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {artisan.approvalStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {artisan.approvalStatus === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleApprove(artisan._id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleReject(artisan._id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

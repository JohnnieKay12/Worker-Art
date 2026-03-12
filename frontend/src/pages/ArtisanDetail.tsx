import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Star, MapPin, Phone, Mail, Calendar, CheckCircle, ArrowLeft, MessageSquare, Briefcase } from 'lucide-react';
import { artisanApi, reviewApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Artisan, Review } from '@/types';

export default function ArtisanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  
  const [artisan, setArtisan] = useState<Artisan | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (id) {
      loadArtisan();
      loadReviews();
    }
  }, [id]);

  const loadArtisan = async () => {
    try {
      const response = await artisanApi.getById(id!);
      if (response.success) {
        setArtisan(response.data);
      }
    } catch (error) {
      console.error('Error loading artisan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const response = await reviewApi.getArtisanReviews(id!, { limit: 5 });
      if (response.success) {
        setReviews(response.data);
        setReviewStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/artisans/${id}` } });
      return;
    }
    navigate('/bookings/create', { state: { artisanId: id } });
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/artisans/${id}` } });
      return;
    }
    navigate('/messages', { state: { artisanId: id } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Artisan not found</h2>
          <Link to="/artisans">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Artisans
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allImages = [
    artisan.user.profileImage,
    ...artisan.workImages.map(img => img.url),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link to="/artisans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Artisans
          </Button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={artisan.user.profileImage} alt={artisan.user.firstName} />
                    <AvatarFallback className="text-3xl">
                      {artisan.user.firstName[0]}{artisan.user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold">
                          {artisan.user.firstName} {artisan.user.lastName}
                        </h1>
                        <p className="text-gray-500">
                          {artisan.skills.map(s => s.name).join(', ')}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="ml-1 font-semibold">{artisan.rating.average.toFixed(1)}</span>
                            <span className="ml-1 text-gray-500">({artisan.rating.count} reviews)</span>
                          </div>
                          <div className="flex items-center text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            {artisan.user.address?.city || 'Nigeria'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ₦{artisan.hourlyRate.toLocaleString()}
                        </p>
                        <p className="text-gray-500">per hour</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      {artisan.isAvailable ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Currently Unavailable</Badge>
                      )}
                      <Badge variant="outline">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {artisan.completedBookings} jobs completed
                      </Badge>
                      {artisan.experience > 0 && (
                        <Badge variant="outline">
                          {artisan.experience} years experience
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="about">
              <TabsList className="w-full">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="work">Work Gallery</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({artisan.rating.count})</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">About</h3>
                    <p className="text-gray-600 whitespace-pre-line">
                      {artisan.bio || 'No bio provided.'}
                    </p>

                    <Separator className="my-6" />

                    <h3 className="font-semibold text-lg mb-4">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {artisan.skills.map((skill) => (
                        <Badge key={skill._id} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>

                    {artisan.certifications && artisan.certifications.length > 0 && (
                      <>
                        <Separator className="my-6" />
                        <h3 className="font-semibold text-lg mb-4">Certifications</h3>
                        <ul className="space-y-2">
                          {artisan.certifications.map((cert, index) => (
                            <li key={index} className="flex items-center text-gray-600">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              {cert.name}
                              {cert.issuer && ` - ${cert.issuer}`}
                              {cert.year && ` (${cert.year})`}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="work" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Work Gallery</h3>
                    {artisan.workImages.length === 0 ? (
                      <p className="text-gray-500">No work images uploaded yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {artisan.workImages.map((image, index) => (
                          <div
                            key={index}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setActiveImage(index + 1)}
                          >
                            <img
                              src={image.url}
                              alt={image.caption || `Work ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-semibold text-lg">Customer Reviews</h3>
                        <p className="text-gray-500">
                          {artisan.rating.count} reviews · {artisan.rating.average.toFixed(1)} average rating
                        </p>
                      </div>
                    </div>

                    {reviews.length === 0 ? (
                      <p className="text-gray-500">No reviews yet.</p>
                    ) : (
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <div key={review._id} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={review.user.profileImage} />
                                  <AvatarFallback>
                                    {review.user.firstName[0]}{review.user.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {review.user.firstName} {review.user.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="mt-3 text-gray-600">{review.comment}</p>
                            {review.response && (
                              <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium">Response from artisan:</p>
                                <p className="text-sm text-gray-600 mt-1">{review.response.text}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardContent className="p-6 space-y-4">
                <Button className="w-full" size="lg" onClick={handleBookNow}>
                  <Calendar className="h-5 w-5 mr-2" />
                  Book Now
                </Button>
                <Button variant="outline" className="w-full" size="lg" onClick={handleMessage}>
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Send Message
                </Button>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Contact Info</h4>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {artisan.user.phone}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {artisan.user.email}
                  </div>
                </div>

                {artisan.serviceArea && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Service Area</h4>
                      <p className="text-gray-600 text-sm">
                        Within {artisan.serviceArea.radius}km radius
                      </p>
                      {artisan.serviceArea.cities && artisan.serviceArea.cities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {artisan.serviceArea.cities.map((city, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {city}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

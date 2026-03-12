import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Search, ArrowRight, CheckCircle, Shield, Clock } from 'lucide-react';
import { categoryApi, artisanApi } from '@/services/api';
import type { ServiceCategory, Artisan } from '@/types';

export default function Home() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [featuredArtisans, setFeaturedArtisans] = useState<Artisan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load categories
      const catResponse = await categoryApi.getAll({ limit: 8 });
      if (catResponse.success) {
        setCategories(catResponse.data);
      }

      // Load featured artisans
      const artResponse = await artisanApi.getAll({ limit: 4, sortBy: 'rating' });
      if (artResponse.success) {
        setFeaturedArtisans(artResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/artisans?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Find Trusted{' '}
                <span className="text-primary">Artisans</span> for Your Home
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                Connect with skilled professionals for all your home service needs. 
                From repairs to renovations, we've got you covered.
              </p>
              
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="What service do you need?"
                    className="pl-10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg">
                  Search
                </Button>
              </form>

              {/* Stats */}
              <div className="flex gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Verified Artisans</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="hidden lg:block relative">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop"
                alt="Professional artisan at work"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">4.9/5 Rating</p>
                    <p className="text-sm text-gray-500">From 10,000+ reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Browse by Category</h2>
            <p className="text-gray-600">Find the right professional for your needs</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/artisans?category=${category._id}`}
                className="group"
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {category.artisanCount} artisans
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/artisans">
              <Button variant="outline" size="lg">
                View All Categories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Artisans Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Top Rated Artisans</h2>
              <p className="text-gray-600">Highly rated professionals in your area</p>
            </div>
            <Link to="/artisans">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredArtisans.map((artisan) => (
              <Link key={artisan._id} to={`/artisans/${artisan._id}`}>
                <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src={artisan.user.profileImage || '/default-avatar.png'}
                      alt={`${artisan.user.firstName} ${artisan.user.lastName}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/90 text-black">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        {artisan.rating.average.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">
                      {artisan.user.firstName} {artisan.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {artisan.skills.map(s => s.name).join(', ')}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-primary font-semibold">
                        ₦{artisan.hourlyRate.toLocaleString()}/hr
                      </span>
                      <span className="text-sm text-gray-500">
                        {artisan.completedBookings} jobs
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600">Get your home services done in 4 simple steps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Search',
                description: 'Browse through our categories or search for specific services',
                icon: Search,
              },
              {
                step: '2',
                title: 'Book',
                description: 'Select an artisan and book an appointment that works for you',
                icon: Calendar,
              },
              {
                step: '3',
                title: 'Get It Done',
                description: 'The artisan arrives and completes the job professionally',
                icon: CheckCircle,
              },
              {
                step: '4',
                title: 'Review',
                description: 'Rate your experience and help others find great artisans',
                icon: Star,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mx-auto -mt-12 mb-4 text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust ArtisanHub for their home service needs.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/artisans">
              <Button size="lg" variant="secondary">
                Find an Artisan
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary"
              >
                Become an Artisan
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { Calendar } from 'lucide-react';

import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Star, MapPin, Search, Filter, X } from 'lucide-react';
import { artisanApi, categoryApi } from '@/services/api';
import type { Artisan, ServiceCategory } from '@/types';

export default function Artisans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  // const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState('rating');

  const loadArtisans = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: 12,
        sortBy,
      };

      if (search) params.search = search;
      // if (selectedCategory) params.category = selectedCategory;
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (minRating > 0) params.minRating = minRating;
      if (priceRange[0] > 0) params.minPrice = priceRange[0];
      if (priceRange[1] < 10000) params.maxPrice = priceRange[1];

      const response = await artisanApi.getAll(params);
      if (response.success) {
        setArtisans(response.data);
        setPagination(response.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Error loading artisans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, minRating, priceRange, sortBy, pagination.page]);

  const loadCategories = async () => {
    try {
      const response = await categoryApi.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadArtisans();
  }, [loadArtisans]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadArtisans();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setMinRating(0);
    setPriceRange([0, 10000]);
    setSortBy('rating');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || selectedCategory || minRating > 0 || priceRange[1] < 10000;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-4">Find Artisans</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or service..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          {(showFilters || hasActiveFilters) && (
            <div className="lg:w-64 space-y-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Filters</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-red-500 hover:text-red-600 flex items-center"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating Filter */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
                  <Select value={minRating.toString()} onValueChange={(v) => setMinRating(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">
                    Price Range: ₦{priceRange[0]} - ₦{priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={10000}
                    step={500}
                    className="w-full"
                  />
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                      <SelectItem value="experience">Most Experienced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {isLoading ? 'Loading...' : `${pagination.total} artisans found`}
              </p>
            </div>

            {/* Artisans Grid */}
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : artisans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No artisans found</p>
                <p className="text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artisans.map((artisan) => (
                    <Link key={artisan._id} to={`/artisans/${artisan._id}`}>
                      <Card className="hover:shadow-lg transition-shadow overflow-hidden h-full">
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
                          <h3 className="font-semibold text-lg">
                            {artisan.user.firstName} {artisan.user.lastName}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {artisan.skills.map(s => s.name).join(', ')}
                          </p>
                          <div className="flex items-center text-sm text-gray-500 mb-3">
                            <MapPin className="h-4 w-4 mr-1" />
                            {artisan.user.address?.city || 'Nigeria'}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-semibold">
                              ₦{artisan.hourlyRate.toLocaleString()}/hr
                            </span>
                            <span className="text-sm text-gray-500">
                              {artisan.completedBookings} jobs done
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-8 gap-2">
                    <Button
                      variant="outline"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

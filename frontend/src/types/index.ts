// User Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string;
  role: 'user' | 'artisan' | 'admin';
  address?: Address;
  isVerified: boolean;
  createdAt?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  landmark?: string;
}

// Artisan Types
export interface Artisan {
  _id: string;
  user: User;
  bio: string;
  skills: ServiceCategory[];
  experience: number;
  hourlyRate: number;
  basePrice: number;
  workImages: WorkImage[];
  certifications?: Certification[];
  availability?: Availability;
  serviceArea?: ServiceArea;
  isApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rating: Rating;
  totalBookings: number;
  completedBookings: number;
  isAvailable: boolean;
  isSuspended: boolean;
  registrationFeePaid: boolean;
}

export interface WorkImage {
  url: string;
  caption?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: number;
}

export interface Availability {
  [key: string]: {
    available: boolean;
    hours: {
      start: string;
      end: string;
    };
  };
}

export interface ServiceArea {
  radius: number;
  cities: string[];
}

export interface Rating {
  average: number;
  count: number;
}

// Service Category Types
export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentCategory?: string;
  subcategories?: ServiceCategory[];
  isActive: boolean;
  displayOrder: number;
  popularServices?: PopularService[];
  artisanCount: number;
}

export interface PopularService {
  name: string;
  description?: string;
  estimatedHours?: number;
}

// Booking Types
export interface Booking {
  _id: string;
  bookingNumber: string;
  user: User;
  artisan: Artisan;
  serviceCategory: ServiceCategory;
  serviceDescription: string;
  address: Address;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;
  price: Price;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payment?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  statusHistory: StatusHistory[];
  artisanResponse?: ArtisanResponse;
  completionDetails?: CompletionDetails;
  cancellation?: Cancellation;
  review?: string;
  chat?: string;
  specialInstructions?: string;
  urgency: 'low' | 'normal' | 'high' | 'emergency';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  artisan: string;
  serviceDescription: string;
  address: Address;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration?: number;
  specialInstructions?: string;
  urgency?: 'low' | 'normal' | 'high' | 'emergency';
}

export interface Price {
  baseAmount: number;
  serviceFee: number;
  materialsFee?: number;
  totalAmount: number;
}

export interface StatusHistory {
  status: string;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

export interface ArtisanResponse {
  respondedAt: string;
  note?: string;
}

export interface CompletionDetails {
  completedAt: string;
  actualDuration?: number;
  finalAmount?: number;
  materialsUsed?: string;
  notes?: string;
}

export interface Cancellation {
  cancelledAt: string;
  cancelledBy: string;
  reason: string;
  refundAmount?: number;
}

// Payment Types
export interface Payment {
  _id: string;
  reference: string;
  paystackReference?: string;
  user: User;
  paymentType: 'booking' | 'artisan_registration' | 'subscription' | 'refund';
  booking?: string;
  artisan?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  paymentChannel?: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
  paidAt?: string;
  createdAt: string;
}

// Review Types
export interface Review {
  _id: string;
  booking: string;
  user: User;
  artisan: string;
  rating: number;
  comment: string;
  categories?: ReviewCategories;
  isVerified: boolean;
  isEdited: boolean;
  helpful: {
    count: number;
    users: string[];
  };
  response?: ReviewResponse;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCategories {
  punctuality?: number;
  professionalism?: number;
  quality?: number;
  communication?: number;
  value?: number;
}

export interface ReviewResponse {
  text: string;
  respondedAt: string;
}

// Message Types
export interface Conversation {
  _id: string;
  participants: Participant[];
  booking?: Booking;
  conversationType: 'booking' | 'support' | 'general';
  lastMessage?: Message;
  lastMessageAt: string;
  lastMessagePreview?: string;
  isActive: boolean;
  unreadCount?: number;
  createdAt: string;
}

export interface Participant {
  user: User;
  role: 'user' | 'artisan';
  joinedAt: string;
  isActive: boolean;
  lastReadAt: string;
  unreadCount: number;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system' | 'booking_update';
  attachments?: Attachment[];
  isRead: boolean;
  readBy: ReadBy[];
  replyTo?: Message;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface Attachment {
  url: string;
  filename?: string;
  fileType?: string;
  fileSize?: number;
}

export interface ReadBy {
  user: string;
  readAt: string;
}

// Dashboard Types
export interface UserDashboard {
  stats: {
    totalBookings: number;
    pendingBookings: number;
    acceptedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalSpent: number;
    pendingPayments: number;
  };
  recentBookings: Booking[];
  recentReviews: Review[];
}

export interface ArtisanDashboard {
  artisan: Artisan;
  stats: {
    totalBookings: number;
    pendingBookings: number;
    acceptedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalEarnings: number;
  };
  recentBookings: Booking[];
  recentReviews: Review[];
}

export interface AdminDashboard {
  counts: {
    users: number;
    artisans: number;
    pendingArtisans: number;
    bookings: number;
    payments: number;
    reviews: number;
  };
  revenue: {
    totalRevenue: number;
    totalTransactions: number;
  };
  monthlyStats: MonthlyStat[];
  recentBookings: Booking[];
  recentUsers: User[];
}

export interface MonthlyStat {
  _id: {
    year: number;
    month: number;
  };
  bookings: number;
  revenue: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
  errorCode?: string;
  errors?: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role?: 'user' | 'artisan';
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Filter Types
export interface ArtisanFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  location?: string;
  isAvailable?: boolean;
  sortBy?: 'rating' | 'price_low' | 'price_high' | 'experience';
}

export interface BookingFilters {
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

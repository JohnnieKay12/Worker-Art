require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, Artisan, ServiceCategory } = require('../models');
const logger = require('../utils/logger');

// Sample service categories
const serviceCategories = [
  {
    name: 'Electrician',
    slug: 'electrician',
    description: 'Electrical repairs, installations, and maintenance services',
    icon: '⚡',
    popularServices: [
      { name: 'Electrical Wiring', description: 'Complete house wiring', estimatedHours: 4 },
      { name: 'Light Fixture Installation', description: 'Install ceiling lights, chandeliers', estimatedHours: 1 },
      { name: 'Socket Repair', description: 'Fix faulty sockets and switches', estimatedHours: 1 },
    ],
  },
  {
    name: 'Plumber',
    slug: 'plumber',
    description: 'Plumbing repairs, installations, and maintenance services',
    icon: '🔧',
    popularServices: [
      { name: 'Pipe Repair', description: 'Fix leaking pipes', estimatedHours: 2 },
      { name: 'Toilet Installation', description: 'Install new toilet fixtures', estimatedHours: 2 },
      { name: 'Water Heater Repair', description: 'Repair or replace water heaters', estimatedHours: 3 },
    ],
  },
  {
    name: 'Cleaner',
    slug: 'cleaner',
    description: 'Professional cleaning services for homes and offices',
    icon: '🧹',
    popularServices: [
      { name: 'Deep Cleaning', description: 'Thorough house cleaning', estimatedHours: 4 },
      { name: 'Office Cleaning', description: 'Commercial space cleaning', estimatedHours: 3 },
      { name: 'Carpet Cleaning', description: 'Professional carpet shampooing', estimatedHours: 2 },
    ],
  },
  {
    name: 'Painter',
    slug: 'painter',
    description: 'Interior and exterior painting services',
    icon: '🎨',
    popularServices: [
      { name: 'Interior Painting', description: 'Paint rooms and interiors', estimatedHours: 6 },
      { name: 'Exterior Painting', description: 'Paint building exteriors', estimatedHours: 8 },
      { name: 'Wallpaper Installation', description: 'Install decorative wallpapers', estimatedHours: 4 },
    ],
  },
  {
    name: 'Mechanic',
    slug: 'mechanic',
    description: 'Vehicle repair and maintenance services',
    icon: '🔩',
    popularServices: [
      { name: 'Oil Change', description: 'Regular oil and filter change', estimatedHours: 1 },
      { name: 'Brake Repair', description: 'Fix or replace brake pads', estimatedHours: 2 },
      { name: 'Engine Diagnostics', description: 'Check and diagnose engine issues', estimatedHours: 1 },
    ],
  },
  {
    name: 'Carpenter',
    slug: 'carpenter',
    description: 'Woodwork, furniture making, and repairs',
    icon: '🪚',
    popularServices: [
      { name: 'Furniture Repair', description: 'Fix broken furniture', estimatedHours: 2 },
      { name: 'Custom Shelving', description: 'Build custom shelves', estimatedHours: 4 },
      { name: 'Door Installation', description: 'Install or repair doors', estimatedHours: 3 },
    ],
  },
  {
    name: 'HVAC Technician',
    slug: 'hvac-technician',
    description: 'Air conditioning and heating system services',
    icon: '❄️',
    popularServices: [
      { name: 'AC Installation', description: 'Install new air conditioners', estimatedHours: 4 },
      { name: 'AC Repair', description: 'Fix faulty AC units', estimatedHours: 2 },
      { name: 'HVAC Maintenance', description: 'Regular system maintenance', estimatedHours: 2 },
    ],
  },
  {
    name: 'Gardener',
    slug: 'gardener',
    description: 'Landscaping and garden maintenance services',
    icon: '🌱',
    popularServices: [
      { name: 'Lawn Mowing', description: 'Cut and trim grass', estimatedHours: 2 },
      { name: 'Garden Design', description: 'Design and plan gardens', estimatedHours: 4 },
      { name: 'Tree Trimming', description: 'Trim and prune trees', estimatedHours: 3 },
    ],
  },
];

// Sample artisan data with Unsplash images
const artisanData = [
  {
    firstName: 'John',
    lastName: 'Okonkwo',
    email: 'john.okonkwo@example.com',
    phone: '+2348012345678',
    skillName: 'Electrician',
    bio: 'Licensed electrician with over 10 years of experience in residential and commercial electrical work. I specialize in wiring, lighting installation, and electrical troubleshooting.',
    hourlyRate: 3500,
    experience: 10,
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    ],
    city: 'Lagos',
    rating: 4.8,
  },
  {
    firstName: 'Michael',
    lastName: 'Adeyemi',
    email: 'michael.adeyemi@example.com',
    phone: '+2348023456789',
    skillName: 'Plumber',
    bio: 'Professional plumber with expertise in pipe fitting, drainage systems, and bathroom installations. I provide fast and reliable service.',
    hourlyRate: 3000,
    experience: 8,
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    ],
    city: 'Abuja',
    rating: 4.6,
  },
  {
    firstName: 'Sarah',
    lastName: 'Okafor',
    email: 'sarah.okafor@example.com',
    phone: '+2348034567890',
    skillName: 'Cleaner',
    bio: 'Detail-oriented cleaning professional. I provide thorough cleaning services for homes and offices, ensuring every corner sparkles.',
    hourlyRate: 1500,
    experience: 5,
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&h=600&fit=crop',
    ],
    city: 'Lagos',
    rating: 4.9,
  },
  {
    firstName: 'Emmanuel',
    lastName: 'Chukwu',
    email: 'emmanuel.chukwu@example.com',
    phone: '+2348045678901',
    skillName: 'Painter',
    bio: 'Creative painter with an eye for detail. I specialize in interior and exterior painting, delivering flawless finishes every time.',
    hourlyRate: 2500,
    experience: 7,
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=600&fit=crop',
    ],
    city: 'Port Harcourt',
    rating: 4.7,
  },
  {
    firstName: 'Ibrahim',
    lastName: 'Mohammed',
    email: 'ibrahim.mohammed@example.com',
    phone: '+2348056789012',
    skillName: 'Mechanic',
    bio: 'Certified auto mechanic with expertise in all vehicle makes and models. From routine maintenance to complex repairs, I\'ve got you covered.',
    hourlyRate: 4000,
    experience: 12,
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=600&fit=crop',
    ],
    city: 'Kano',
    rating: 4.5,
  },
  {
    firstName: 'David',
    lastName: 'Nwosu',
    email: 'david.nwosu@example.com',
    phone: '+2348067890123',
    skillName: 'Carpenter',
    bio: 'Skilled carpenter with a passion for woodwork. I create custom furniture and provide quality repairs for all your carpentry needs.',
    hourlyRate: 2800,
    experience: 9,
    profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1611486212557-88be5ff6f941?w=800&h=600&fit=crop',
    ],
    city: 'Enugu',
    rating: 4.8,
  },
  {
    firstName: 'Fatima',
    lastName: 'Abdullah',
    email: 'fatima.abdullah@example.com',
    phone: '+2348078901234',
    skillName: 'HVAC Technician',
    bio: 'HVAC specialist with expertise in air conditioning installation, repair, and maintenance. Keeping your space comfortable all year round.',
    hourlyRate: 4500,
    experience: 6,
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1631545308772-81a0e0a3a6ae?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=600&fit=crop',
    ],
    city: 'Abuja',
    rating: 4.7,
  },
  {
    firstName: 'Grace',
    lastName: 'Eze',
    email: 'grace.eze@example.com',
    phone: '+2348089012345',
    skillName: 'Gardener',
    bio: 'Passionate gardener with a green thumb. I transform outdoor spaces into beautiful gardens and provide regular maintenance services.',
    hourlyRate: 2000,
    experience: 4,
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=600&fit=crop',
    ],
    city: 'Lagos',
    rating: 4.9,
  },
  {
    firstName: 'Peter',
    lastName: 'Adeleke',
    email: 'peter.adeleke@example.com',
    phone: '+2348090123456',
    skillName: 'Electrician',
    bio: 'Reliable electrician specializing in both residential and commercial projects. Safety and quality are my top priorities.',
    hourlyRate: 3200,
    experience: 6,
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop',
    ],
    city: 'Ibadan',
    rating: 4.4,
  },
  {
    firstName: 'Blessing',
    lastName: 'Yusuf',
    email: 'blessing.yusuf@example.com',
    phone: '+2348101234567',
    skillName: 'Cleaner',
    bio: 'Dedicated cleaning professional providing top-notch cleaning services. I use eco-friendly products and pay attention to every detail.',
    hourlyRate: 1800,
    experience: 3,
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    workImages: [
      'https://images.unsplash.com/photo-1527515545081-5db817172677?w=800&h=600&fit=crop',
    ],
    city: 'Kaduna',
    rating: 4.6,
  },
];

// Seed service categories
const seedCategories = async () => {
  try {
    await ServiceCategory.deleteMany({});
    logger.info('Cleared existing categories');

    const categories = await ServiceCategory.insertMany(serviceCategories);
    logger.info(`Seeded ${categories.length} service categories`);
    
    return categories;
  } catch (error) {
    logger.error('Error seeding categories:', error.message);
    throw error;
  }
};

// Seed artisans
const seedArtisans = async (categories) => {
  try {
    // Clear existing artisans and related users
    const existingArtisanEmails = artisanData.map(a => a.email);
    await User.deleteMany({ email: { $in: existingArtisanEmails } });
    await Artisan.deleteMany({});
    logger.info('Cleared existing artisans');

    const createdArtisans = [];

    for (const data of artisanData) {
      // Find the skill category
      const category = categories.find(c => c.name === data.skillName);
      if (!category) {
        logger.warn(`Category not found: ${data.skillName}`);
        continue;
      }

      // Create user
      const user = await User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: 'password123',
        phone: data.phone,
        role: 'artisan',
        profileImage: data.profileImage,
        address: {
          city: data.city,
          country: 'Nigeria',
        },
        isVerified: true,
      });

      // Create artisan profile
      const artisan = await Artisan.create({
        user: user._id,
        bio: data.bio,
        skills: [category._id],
        hourlyRate: data.hourlyRate,
        experience: data.experience,
        workImages: data.workImages.map(url => ({ url, caption: '' })),
        isApproved: true,
        approvalStatus: 'approved',
        approvalDate: new Date(),
        registrationFeePaid: true,
        rating: {
          average: data.rating,
          count: Math.floor(Math.random() * 50) + 10,
        },
        totalBookings: Math.floor(Math.random() * 100) + 20,
        completedBookings: Math.floor(Math.random() * 80) + 15,
      });

      // Update category artisan count
      await ServiceCategory.findByIdAndUpdate(category._id, {
        $inc: { artisanCount: 1 },
      });

      createdArtisans.push({ user, artisan });
      logger.info(`Created artisan: ${data.firstName} ${data.lastName}`);
    }

    logger.info(`Seeded ${createdArtisans.length} artisans`);
    return createdArtisans;
  } catch (error) {
    logger.error('Error seeding artisans:', error.message);
    throw error;
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@artisanmarketplace.com';
    
    await User.deleteOne({ email: adminEmail });
    
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'admin123456',
      phone: '+2348000000000',
      role: 'admin',
      isVerified: true,
    });

    logger.info(`Admin user created: ${adminEmail}`);
    return admin;
  } catch (error) {
    logger.error('Error creating admin user:', error.message);
    throw error;
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    logger.info('Starting database seeding...');

    // Seed categories
    const categories = await seedCategories();

    // Seed artisans
    await seedArtisans(categories);

    // Create admin user
    await createAdminUser();

    logger.info('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedCategories,
  seedArtisans,
  createAdminUser,
};

'use server'

import { db } from '@/database/db';
import { accounts, boats, users, boatCategoryEnum } from '@/database/schema';
import { sql } from 'drizzle-orm';

// Helper function to get a random number between min and max
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get a random boolean with a probability
function getRandomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

// First, we need to make sure we have at least one user to be the owner
async function ensureOwnerExists() {
  // Only select id to avoid issues with missing columns
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  
  if (existingUsers.length === 0) {
    // Create a default owner if no users exist
    const [newUser] = await db.insert(users).values({
      email: 'owner@example.com',
      username: 'boatowner',
      name: 'Boat Owner',
      firstName: 'Boat',
      lastName: 'Owner',
      role: 'owner',
      status: 'ACTIVE',
      emailVerified: true
    }).returning({ id: users.id });

    // Email + password sign-in (password: password123)
    await db.insert(accounts).values({
      userId: newUser.id,
      providerId: 'credential',
      accountId: newUser.id,
      password: '$2a$10$8Ux8xJFKZSAiCIWUG4JXAOcQY0Zl/WOSw8vXXP.MZ6gU5V4m3dUUa',
    });
    console.log('Created default owner with ID:', newUser.id);
    return newUser.id;
  }
  
  console.log('Using existing owner with ID:', existingUsers[0].id);
  return existingUsers[0].id;
}

// Test boat data
const testBoats = [
  {
    name: 'Sea Breeze',
    category: 'YACHT',
    capacity: 12,
    lengthFt: 45,
    features: ['Air Conditioning', 'Bluetooth Sound System', 'Cabin', 'GPS', 'Life Jackets']
  },
  {
    name: 'Island Hopper',
    category: 'CATAMARAN',
    capacity: 8,
    lengthFt: 38,
    features: ['Snorkeling Gear', 'Refrigerator', 'Shower', 'Swim Ladder', 'Toilet']
  },
  {
    name: 'Coastal Cruiser',
    category: 'MOTOR_YACHT',
    capacity: 10,
    lengthFt: 52,
    features: ['Air Conditioning', 'TV', 'Kitchenette', 'Shower', 'WiFi']
  },
  {
    name: 'Wave Dancer',
    category: 'SAILBOAT',
    capacity: 6,
    lengthFt: 35,
    features: ['GPS', 'Life Jackets', 'Stereo System', 'Toilet', 'Sink']
  }
];

// Sample port locations
const locations = [
  { name: 'Miami Marina', lat: 25.7617, lng: -80.1918 },
  { name: 'Newport Beach', lat: 33.6189, lng: -117.9298 },
  { name: 'San Diego Harbor', lat: 32.7157, lng: -117.1611 },
  { name: 'Seattle Waterfront', lat: 47.6062, lng: -122.3321 }
];

// Main function to seed boats
export async function seedBoats() {
  try {
    console.log('Starting to seed boats...');
    
    // Make sure we have an owner
    const ownerId = await ensureOwnerExists();
    
    // Delete existing boats (for testing to avoid duplicates)
    await db.delete(boats);
    console.log('Deleted existing boats');
    
    // Create test boats
    for (let i = 0; i < testBoats.length; i++) {
      const boat = testBoats[i];
      const location = locations[i];
      
      await db.insert(boats).values({
        name: boat.name,
        displayTitle: `${boat.name} - ${boat.lengthFt}ft ${boat.category}`,
        description: `Experience the ultimate boating adventure on the ${boat.name}. This beautiful ${boat.lengthFt}-foot vessel is perfect for day trips, fishing excursions, or sunset cruises.`,
        category: boat.category as typeof boatCategoryEnum.enumValues[number],
        capacity: boat.capacity,
        active: getRandomBoolean(0.8), // 80% chance of being active
        featured: getRandomBoolean(0.5), // 50% chance of being featured
        
        // Owner Information
        ownerId: ownerId,
        
        // Boat Specifications
        make: ['Sea Ray', 'Boston Whaler', 'Bayliner', 'Chaparral'][i % 4],
        model: ['Sundancer 320', 'Outrage 250', 'Element E18', 'Signature 250'][i % 4],
        yearBuilt: getRandomNumber(2015, 2023),
        lengthFt: boat.lengthFt,
        bathrooms: getRandomNumber(1, 3),
        showers: getRandomNumber(0, 2),
        sleeps: getRandomNumber(0, 6),
        range: getRandomNumber(100, 500),
        
        // Features
        features: boat.features,
        safetyEquipment: ['Life Jackets', 'Fire Extinguisher', 'First Aid Kit'],
        
        // Media
        mainImage: `/images/boats/yacht${i+1}.jpg`,
        galleryImages: Array(3).fill('').map((_, j) => `/images/boats/yacht${j+1}.jpg`),
        
        // Location
        locationLabel: location.name,
        location: sql`ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)`,
        availableDestinations: ['Key West', 'Bahamas', 'Cuba'],
        dockInfo: 'Dock B, Slip 42',
        parkingInfo: 'Free parking available in Marina lot',
        
        // Charter Options
        crewRequired: getRandomBoolean(0.7),
        crewIncluded: getRandomBoolean(0.6),
        dayCharter: true,
        termCharter: getRandomBoolean(0.4),
        minimumCharterDays: getRandomNumber(1, 5),
        
        // Booking Options
        instantBook: getRandomBoolean(0.5),
        
        // Fuel Details
        fuelIncluded: getRandomBoolean(0.3),
        
        // Rules & Instructions
        rules: 'No smoking. No pets. No shoes on deck. No fishing in marina. Return with full fuel tank.',
      });
      
      console.log(`Created boat: ${boat.name}`);
    }
    
    console.log('Successfully seeded boats');
    return { success: true, message: `Created ${testBoats.length} test boats` };
  } catch (error) {
    console.error('Error seeding boats:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Export for direct execution
export default seedBoats;
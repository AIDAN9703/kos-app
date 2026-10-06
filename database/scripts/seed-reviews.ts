import { db } from '@/database/db';
import { boats, reviews, users } from '@/database/schema';
import { eq } from "drizzle-orm";

// Exactly 20 fake reviewer profiles - diverse and realistic
const reviewerProfiles = [
  // Professional/Adult names
  { firstName: "Sarah", lastName: "Johnson", email: "sarah.j@email.com" },
  { firstName: "Michael", lastName: "Chen", email: "mike.chen@email.com" },
  { firstName: "Emily", lastName: "Rodriguez", email: "emily.r@email.com" },
  { firstName: "David", lastName: "Thompson", email: "david.t@email.com" },
  { firstName: "Jessica", lastName: "Williams", email: "jessica.w@email.com" },
  { firstName: "Christopher", lastName: "Anderson", email: "chris.a@email.com" },
  { firstName: "Amanda", lastName: "Brown", email: "amanda.b@email.com" },
  { firstName: "Ryan", lastName: "Davis", email: "ryan.d@email.com" },
  { firstName: "Lisa", lastName: "Wilson", email: "lisa.w@email.com" },
  { firstName: "Kevin", lastName: "Martinez", email: "kevin.m@email.com" },
  
  // International names
  { firstName: "Marco", lastName: "Santana", email: "marco.santana@email.com" },
  { firstName: "Priya", lastName: "Patel", email: "priya.patel@email.com" },
  { firstName: "Jean-Luc", lastName: "Dubois", email: "jean.dubois@email.com" },
  { firstName: "Yuki", lastName: "Tanaka", email: "yuki.tanaka@email.com" },
  { firstName: "Carlos", lastName: "Mendoza", email: "carlos.mendoza@email.com" },
  { firstName: "Elena", lastName: "Volkov", email: "elena.volkov@email.com" },
  { firstName: "Ahmed", lastName: "Hassan", email: "ahmed.hassan@email.com" },
  { firstName: "Sophie", lastName: "Larsson", email: "sophie.larsson@email.com" },
  { firstName: "Diego", lastName: "Silva", email: "diego.silva@email.com" },
  { firstName: "Fatima", lastName: "Al-Rashid", email: "fatima.alrashid@email.com" },
];

// High-quality 5-star review content
const reviewTemplates = [
  "Absolutely incredible experience! The boat was pristine and the captain was amazing. Highly recommend!",
  "Perfect day on the water! Everything exceeded our expectations. The crew was professional and friendly.",
  "Outstanding charter experience! Beautiful boat, great service, and unforgettable memories.",
  "Five stars all the way! The boat was exactly as advertised and the captain went above and beyond.",
  "Couldn't have asked for a better day! The boat was immaculate and the service was top-notch.",
  "Amazing experience from start to finish! Professional crew, beautiful boat, perfect weather.",
  "Best boat charter we've ever done! The captain was knowledgeable and the boat was stunning.",
  "Phenomenal day on the water! Everything was perfect - the boat, crew, and overall experience.",
  "This charter exceeded every expectation! The boat was luxurious, crew was fantastic, and we saw dolphins!",
  "Absolutely magical day! The sunset cruise was breathtaking and the captain found the perfect spots.",
  "Flawless experience! The boat was immaculate, crew was attentive, and the views were spectacular.",
  "Cannot recommend this enough! Professional service, gorgeous boat, and memories that will last forever.",
  "Best money we've ever spent! The captain was incredibly knowledgeable about local waters and wildlife.",
  "Perfect for our anniversary celebration! The crew made everything special and the boat was luxurious.",
  "Outstanding service from booking to departure! The boat exceeded photos and the crew was wonderful.",
  "Incredible value for an unforgettable experience! Will definitely book again for future celebrations.",
  "The highlight of our vacation! Beautiful boat, amazing crew, and perfect weather made it magical.",
  "World-class charter experience! Every detail was perfect and the captain's expertise really showed.",
  "Couldn't be happier with our choice! The boat was stunning and the crew went above and beyond.",
  "Perfect day on the water! Great for families - kids loved it and adults could relax completely.",
];

// High-quality 5-star review titles
const reviewTitles = [
  "Perfect Day on the Water!",
  "Exceeded All Expectations!",
  "Outstanding Charter Experience",
  "Absolutely Amazing!",
  "Five Star Experience",
  "Incredible Day Out",
  "Best Charter Ever!",
  "Magical Day on the Water",
  "Unforgettable Experience!",
  "World-Class Service",
  "Perfect Celebration Charter",
  "Exceptional Quality & Service",
  "Breathtaking Views & Perfect Crew",
  "Luxurious & Professional",
  "Highlight of Our Vacation",
  "Flawless Charter Experience",
  "Stunning Boat, Amazing Crew",
  "Couldn't Ask for Better!",
  "Top-Notch Charter Service",
  "Perfect Family Adventure",
];

// Helper functions
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(): Date {
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
  return new Date(randomTime);
}

function getRandomReviewCount(): number {
  // Return 1-5 reviews per boat
  return Math.floor(Math.random() * 5) + 1;
}

export async function seedReviews() {
  console.log("🌱 Starting review seeding process...");
  console.log("📋 Database already cleaned up - creating new fake users and reviews");
  
  try {
    // Get all active boats
    const allBoats = await db.select({ id: boats.id, name: boats.name }).from(boats).where(eq(boats.active, true));
    console.log(`📋 Found ${allBoats.length} active boats`);
    
    // Create exactly 20 fake reviewer users
    console.log("👥 Creating 20 fake reviewer accounts...");
    const reviewerUsers = [];
    
    for (const profile of reviewerProfiles) {
      try {
        const [newUser] = await db.insert(users).values({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          username: profile.email, // Use email as username for simplicity
          name: `${profile.firstName} ${profile.lastName}`,
          emailVerified: true,
        }).returning();
        
        reviewerUsers.push(newUser);
        console.log(`✅ Created user: ${profile.firstName} ${profile.lastName}`);
      } catch (error) {
        console.warn(`⚠️  Could not create reviewer ${profile.email}:`, error);
      }
    }
    
    console.log(`👥 Successfully created ${reviewerUsers.length} fake reviewer accounts`);
    
    if (reviewerUsers.length === 0) {
      throw new Error("No fake users were created. Cannot proceed with review creation.");
    }
    
    let totalReviewsCreated = 0;
    let boatsWithReviews = 0;
    
    // Generate reviews for each boat
    console.log("⭐ Creating reviews for all boats...");
    
    for (const boat of allBoats) {
      const reviewCount = getRandomReviewCount(); // 1-5 reviews per boat
      boatsWithReviews++;
      
      // Shuffle users to ensure no duplicates per boat
      const shuffledUsers = [...reviewerUsers].sort(() => Math.random() - 0.5);
      const boatReviews = [];
      
      // Generate reviews for this boat
      for (let i = 0; i < reviewCount; i++) {
        const reviewer = shuffledUsers[i]; // Each boat gets different users
        const reviewDate = getRandomDate();
        
        const reviewData = {
          type: 'BOAT' as const,
          status: 'PUBLISHED' as const,
          reviewerId: reviewer.id,
          reviewedBoatId: boat.id,
          rating: 5, // All reviews are 5 stars
          title: getRandomItem(reviewTitles),
          content: getRandomItem(reviewTemplates),
          isVerified: Math.random() < 0.8, // 80% of reviews are verified
          isFeatured: Math.random() < 0.05, // 5% are featured
          helpfulCount: Math.floor(Math.random() * 8), // 0-7 helpful votes
          createdAt: reviewDate,
          updatedAt: reviewDate,
        };
        
        boatReviews.push(reviewData);
      }
      
      // Insert all reviews for this boat
      await db.insert(reviews).values(boatReviews);
      
      console.log(`⭐ Boat "${boat.name}" - ${reviewCount} reviews (all 5★)`);
      totalReviewsCreated += reviewCount;
    }
    
    console.log("\n✅ Review seeding completed!");
    console.log(`📊 Statistics:`);
    console.log(`   • Total boats: ${allBoats.length}`);
    console.log(`   • Boats with reviews: ${boatsWithReviews}`);
    console.log(`   • Total reviews created: ${totalReviewsCreated}`);
    console.log(`   • Average reviews per boat: ${(totalReviewsCreated / boatsWithReviews).toFixed(1)}`);
    console.log(`   • All reviews are 5-star ratings`);
    console.log(`   • No duplicate users per boat`);
    console.log(`   • Fake users created: ${reviewerUsers.length}`);
    
  } catch (error) {
    console.error("❌ Error seeding reviews:", error);
    throw error;
  }
}

// Run the seeder if called directly
if (require.main === module) {
  seedReviews()
    .then(() => {
      console.log("🎉 Review seeding finished successfully!");
      console.log("💡 Next step: Run 'npm run db:update-review-stats' to update boat statistics");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Review seeding failed:", error);
      process.exit(1);
    });
} 
import 'dotenv/config';
import mongoose from 'mongoose';
import Business from '../src/models/Business.js';
import BoardMeta from '../src/models/BoardMeta.js';
import { connectDB } from '../src/config/db.js';

const businesses = [
  {
    name: 'Sundar Chai House',
    url: 'sundarchaihouse.in',
    description:
      'Modern chai and light-meals chain with 14 outlets across Bengaluru, known for single-origin Assam blends.',
    amount: 10000,
  },
  {
    name: 'Nova Cloud Systems',
    url: 'novacloud.io',
    description: 'Cloud infrastructure and DevOps consulting for manufacturing and logistics firms.',
    amount: 9000,
  },
  {
    name: 'Shanti Real Estate',
    url: 'shantirealty.in',
    description: "Residential and commercial brokerage in Mumbai's western suburbs.",
    amount: 7000,
  },
  {
    name: 'Apex Dental Care',
    url: 'apexdental.in',
    description: 'Multi-chair dental clinic offering general and cosmetic dentistry.',
    amount: 6000,
  },
  {
    name: 'Bright Minds Academy',
    url: 'brightminds.edu.in',
    description: 'K-12 tutoring centre for board-exam prep and spoken English.',
    amount: 5000,
  },
  {
    name: 'Sharma & Associates',
    url: 'sharmafinance.in',
    description: 'Chartered accountancy and tax advisory for small businesses.',
    amount: 4000,
  },
  {
    name: 'Green Leaf Organics',
    url: 'greenleaforganics.in',
    description: 'Organic grocery and produce delivery in South Chennai.',
    amount: 3500,
  },
  {
    name: 'Kumar Electricals',
    url: 'kumarelectricals.in',
    description: 'Residential and commercial electrical contracting since 2009.',
    amount: 3000,
  },
  {
    name: 'Coastal Interiors',
    url: 'coastalinteriors.in',
    description: 'Interior design and turnkey fit-out studio for homes and cafés.',
    amount: 2000,
  },
  {
    name: 'Metro Fitness Studio',
    url: 'metrofitness.in',
    description: 'Boutique strength-and-conditioning studio with certified trainers.',
    amount: 1000,
  },
];

async function run() {
  await connectDB();
  await Business.deleteMany({});
  await Business.insertMany(businesses);
  console.log(`[seed] inserted ${businesses.length} businesses`);

  // Keep the atomic "next price" reservation point (see BoardMeta) in sync with
  // the freshly seeded board, otherwise next-price would still reflect whatever
  // amount was reserved before this reset.
  const topAmount = Math.max(...businesses.map((b) => b.amount));
  await BoardMeta.findOneAndUpdate(
    { _id: 'singleton' },
    { $set: { topAmount } },
    { upsert: true }
  );
  console.log(`[seed] board meta topAmount reset to ${topAmount}`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});

/**
 * SkillSwap Database Seed
 * Creates realistic sample data for development
 */

import { PrismaClient, SkillLevel, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SKILLS_DATA = [
  { title: 'React & TypeScript Development', category: 'Programming', level: 'ADVANCED' as SkillLevel, tags: ['react', 'typescript', 'frontend'], description: 'Learn modern React patterns, hooks, and TypeScript best practices from a senior frontend developer.' },
  { title: 'Python for Data Science', category: 'Programming', level: 'INTERMEDIATE' as SkillLevel, tags: ['python', 'data', 'pandas'], description: 'Master data manipulation with pandas, visualization with matplotlib, and intro to ML.' },
  { title: 'UI/UX Design Fundamentals', category: 'Design', level: 'BEGINNER' as SkillLevel, tags: ['figma', 'ux', 'design'], description: 'Learn user-centered design principles, Figma workflows, and how to create stunning interfaces.' },
  { title: 'Spanish Conversation', category: 'Language', level: 'BEGINNER' as SkillLevel, tags: ['spanish', 'language', 'conversation'], description: 'Native Spanish speaker offering conversational practice for beginners and intermediates.' },
  { title: 'Digital Marketing Strategy', category: 'Marketing', level: 'INTERMEDIATE' as SkillLevel, tags: ['seo', 'marketing', 'growth'], description: 'Growth hacking, SEO, paid ads, and content strategy for startups and small businesses.' },
  { title: 'Guitar for Beginners', category: 'Music', level: 'BEGINNER' as SkillLevel, tags: ['guitar', 'music', 'instrument'], description: 'Learn chords, strumming patterns, and popular songs on acoustic guitar. All ages welcome.' },
  { title: 'Node.js Backend Engineering', category: 'Programming', level: 'ADVANCED' as SkillLevel, tags: ['nodejs', 'express', 'backend'], description: 'Build scalable REST APIs, WebSockets, and microservices with Node.js and TypeScript.' },
  { title: 'Photography & Lightroom', category: 'Photography', level: 'INTERMEDIATE' as SkillLevel, tags: ['photography', 'lightroom', 'editing'], description: 'Composition, lighting theory, and post-processing workflows for portrait and landscape photography.' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillswap.io' },
    update: {},
    create: {
      email: 'admin@skillswap.io',
      name: 'SkillSwap Admin',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      credits: 100,
      emailVerified: true,
      bio: 'Platform administrator',
      creditTransactions: {
        create: { amount: 100, type: 'ADMIN_ADJUSTMENT', description: 'Admin credits' },
      },
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create 8 sample users
  const userPassHash = await bcrypt.hash('Password@123', 12);
  const users = [];

  const userData = [
    { name: 'Alice Chen', email: 'alice@example.com', bio: 'Senior React developer with 6 years experience. Passionate about teaching.' },
    { name: 'Bob Martinez', email: 'bob@example.com', bio: 'Data scientist at a fintech startup. Love sharing Python knowledge.' },
    { name: 'Chloe Park', email: 'chloe@example.com', bio: 'Freelance UX designer. I help people build user-friendly products.' },
    { name: 'David Okafor', email: 'david@example.com', bio: 'Native Spanish speaker from Madrid. Language exchange enthusiast.' },
    { name: 'Emma Wilson', email: 'emma@example.com', bio: 'Digital marketer with 8 years experience scaling startups.' },
    { name: 'Finn Larsen', email: 'finn@example.com', bio: 'Guitar teacher and musician. 10+ years playing experience.' },
    { name: 'Grace Liu', email: 'grace@example.com', bio: 'Backend engineer specializing in Node.js and distributed systems.' },
    { name: 'Hassan Khalil', email: 'hassan@example.com', bio: 'Photographer and Lightroom expert. Shot for National Geographic.' },
  ];

  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        passwordHash: userPassHash,
        credits: 5 + Math.floor(Math.random() * 15),
        emailVerified: true,
        creditTransactions: {
          create: { amount: 5, type: 'SIGNUP_BONUS', description: 'Welcome bonus' },
        },
      },
    });
    users.push(user);
  }

  console.log(`✅ ${users.length} users created`);

  // Create skills (each user owns one)
  for (let i = 0; i < SKILLS_DATA.length; i++) {
    await prisma.skill.create({
      data: {
        ...SKILLS_DATA[i],
        teacherId: users[i].id,
        sessionsCount: Math.floor(Math.random() * 20),
        rating: 4 + Math.random(),
      },
    });
  }

  console.log(`✅ ${SKILLS_DATA.length} skills created`);

  // Create some completed sessions with reviews
  const skills = await prisma.skill.findMany({ take: 4 });
  for (let i = 0; i < 4; i++) {
    const skill = skills[i];
    const learnerId = users[(i + 4) % users.length].id;

    const videoRoom = await prisma.videoRoom.create({
      data: { roomToken: `completed-room-${i}`, status: 'ENDED' },
    });

    const session = await prisma.session.create({
      data: {
        title: `${skill.title} Session`,
        teacherId: skill.teacherId,
        learnerId,
        skillId: skill.id,
        scheduledAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 + 1000),
        endedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 + 3600 * 1000),
        durationSecs: 3600,
        creditAmount: 1,
        status: 'COMPLETED',
        videoRoomId: videoRoom.id,
      },
    });

    await prisma.review.create({
      data: {
        sessionId: session.id,
        authorId: learnerId,
        targetId: skill.teacherId,
        rating: 4 + Math.floor(Math.random() * 2),
        comment: 'Excellent session! Very knowledgeable and patient teacher. I learned so much.',
      },
    });
  }

  console.log(`✅ Sample sessions and reviews created`);
  console.log('\n🎉 Seed complete!\n');
  console.log('Test credentials:');
  console.log('  Admin:    admin@skillswap.io / Admin@123');
  console.log('  User:     alice@example.com / Password@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

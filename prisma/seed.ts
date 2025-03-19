import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  const email = "rachel@remix.run";

  // cleanup the existing database
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  const hashedPassword = await bcrypt.hash("racheliscool", 10);

  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      password: {
        create: {
          hash: "yourHashedPasswordString",
        },
      },
      userType: "STUDENT", // or "INSTRUCTOR", depending on the user being created
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "instructor@email.com",
      password: {
        create: {
          hash: "password",
        },
      },
      userType: "INSTRUCTOR", // or "INSTRUCTOR", depending on the user being created
    },
  });

  await prisma.note.create({
    data: {
      title: "My first note",
      body: "Hello, world!",
      userId: user.id,
    },
  });

  await prisma.note.create({
    data: {
      title: "My second note",
      body: "Hello, world!",
      userId: user.id,
    },
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

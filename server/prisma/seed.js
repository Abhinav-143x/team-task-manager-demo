import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Demo Admin",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN"
    }
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: {
      name: "Demo Member",
      email: "member@example.com",
      passwordHash,
      role: "MEMBER"
    }
  });

  const project = await prisma.project.upsert({
    where: { id: "demo-project" },
    update: {},
    create: {
      id: "demo-project",
      name: "Launch Website",
      description: "Demo project for assignment evaluation.",
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: member.id, role: "MEMBER" }
        ]
      }
    }
  });

  const existingTasks = await prisma.task.count({ where: { projectId: project.id } });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Prepare landing copy",
          description: "Write page sections and CTA text.",
          status: "TODO",
          dueDate: new Date(Date.now() + 86400000 * 2),
          projectId: project.id,
          assigneeId: member.id,
          createdById: admin.id
        },
        {
          title: "Connect dashboard data",
          description: "Show assigned, overdue, and completed tasks.",
          status: "IN_PROGRESS",
          dueDate: new Date(Date.now() - 86400000),
          projectId: project.id,
          assigneeId: admin.id,
          createdById: admin.id
        }
      ]
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

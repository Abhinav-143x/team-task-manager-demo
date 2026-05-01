import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { signToken } from "./auth.js";
import {
  validate,
  requireAuth,
  requireProjectMember,
  requireProjectAdmin,
  errorHandler
} from "./middleware.js";
import {
  signupSchema,
  loginSchema,
  projectSchema,
  memberSchema,
  memberRoleSchema,
  taskSchema,
  taskUpdateSchema
} from "./validators.js";

const app = express();
const port = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());

const safeUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true
};

const projectInclude = {
  owner: { select: safeUser },
  members: {
    include: { user: { select: safeUser } },
    orderBy: { joinedAt: "asc" }
  },
  tasks: {
    include: {
      assignee: { select: safeUser },
      createdBy: { select: safeUser }
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }]
  }
};

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: req.body.role || "MEMBER"
      },
      select: safeUser
    });

    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", validate(loginSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
    res.json({ user: publicUser, token: signToken(publicUser) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/dashboard", requireAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const visibleTaskWhere = {
      OR: [
        { assigneeId: req.user.id },
        { project: { members: { some: { userId: req.user.id } } } }
      ]
    };

    const [tasks, overdue, projects] = await Promise.all([
      prisma.task.findMany({
        where: visibleTaskWhere,
        include: { project: true, assignee: { select: safeUser } },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }]
      }),
      prisma.task.count({
        where: {
          ...visibleTaskWhere,
          dueDate: { lt: now },
          status: { not: "DONE" }
        }
      }),
      prisma.project.count({
        where: { members: { some: { userId: req.user.id } } }
      })
    ]);

    const status = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    tasks.forEach((task) => {
      status[task.status] += 1;
    });

    res.json({
      totalTasks: tasks.length,
      overdue,
      projects,
      status,
      recentTasks: tasks.slice(0, 8)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects", requireAuth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where:
        req.user.role === "ADMIN"
          ? {}
          : { members: { some: { userId: req.user.id } } },
      include: {
        members: { include: { user: { select: safeUser } } },
        _count: { select: { tasks: true } }
      },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects", requireAuth, validate(projectSchema), async (req, res, next) => {
  try {
    const project = await prisma.project.create({
      data: {
        name: req.body.name,
        description: req.body.description || null,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: "ADMIN" }
        }
      },
      include: projectInclude
    });
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:id", requireAuth, requireProjectMember, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: projectInclude
    });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/projects/:id",
  requireAuth,
  requireProjectAdmin,
  validate(projectSchema),
  async (req, res, next) => {
    try {
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          description: req.body.description || null
        },
        include: projectInclude
      });
      res.json({ project });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/projects/:projectId/members",
  requireAuth,
  requireProjectAdmin,
  validate(memberSchema),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (!user) return res.status(404).json({ message: "User must sign up before being added" });

      await prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: req.params.projectId, userId: user.id }
        },
        update: { role: req.body.role },
        create: {
          projectId: req.params.projectId,
          userId: user.id,
          role: req.body.role
        }
      });

      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: projectInclude
      });
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/projects/:projectId/members/:userId",
  requireAuth,
  requireProjectAdmin,
  validate(memberRoleSchema),
  async (req, res, next) => {
    try {
      await prisma.projectMember.update({
        where: {
          projectId_userId: { projectId: req.params.projectId, userId: req.params.userId }
        },
        data: { role: req.body.role }
      });
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: projectInclude
      });
      res.json({ project });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/projects/:projectId/members/:userId",
  requireAuth,
  requireProjectAdmin,
  async (req, res, next) => {
    try {
      if (req.params.userId === req.user.id) {
        return res.status(400).json({ message: "You cannot remove yourself" });
      }
      await prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId: req.params.projectId, userId: req.params.userId }
        }
      });
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: projectInclude
      });
      res.json({ project });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/projects/:projectId/tasks",
  requireAuth,
  requireProjectAdmin,
  validate(taskSchema),
  async (req, res, next) => {
    try {
      const assigneeId = req.body.assigneeId || null;
      if (assigneeId) {
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: req.params.projectId, userId: assigneeId }
          }
        });
        if (!member) return res.status(400).json({ message: "Assignee must be on the project" });
      }

      await prisma.task.create({
        data: {
          title: req.body.title,
          description: req.body.description || null,
          dueDate: normalizeDate(req.body.dueDate),
          projectId: req.params.projectId,
          assigneeId,
          createdById: req.user.id
        }
      });

      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: projectInclude
      });
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  }
);

app.patch("/api/tasks/:taskId", requireAuth, validate(taskUpdateSchema), async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { project: { include: { members: true } } }
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const membership = task.project.members.find((member) => member.userId === req.user.id);
    const isAdmin = req.user.role === "ADMIN" || membership?.role === "ADMIN";
    const isAssignee = task.assigneeId === req.user.id;
    if (!isAdmin && !isAssignee) return res.status(403).json({ message: "Task access denied" });

    const data = {};
    if (req.body.status) data.status = req.body.status;
    if (isAdmin) {
      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined) data.description = req.body.description || null;
      if (req.body.dueDate !== undefined) data.dueDate = normalizeDate(req.body.dueDate);
      if (req.body.assigneeId !== undefined) data.assigneeId = req.body.assigneeId || null;
    }

    if (data.assigneeId) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: data.assigneeId }
        }
      });
      if (!member) return res.status(400).json({ message: "Assignee must be on the project" });
    }

    await prisma.task.update({ where: { id: req.params.taskId }, data });
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: projectInclude
    });
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:taskId", requireAuth, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { project: { include: { members: true } } }
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const membership = task.project.members.find((member) => member.userId === req.user.id);
    if (req.user.role !== "ADMIN" && membership?.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: projectInclude
    });
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});

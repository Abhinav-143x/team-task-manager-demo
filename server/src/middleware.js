import { prisma } from "./db.js";
import { verifyToken } from "./auth.js";

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors
      });
    }
    req.body = parsed.data;
    next();
  };
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    if (!user) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function requireProjectMember(req, res, next) {
  const projectId = req.params.projectId || req.params.id;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } }
  });

  if (!membership && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Project access denied" });
  }

  req.membership = membership || { role: "ADMIN", projectId, userId: req.user.id };
  next();
}

export async function requireProjectAdmin(req, res, next) {
  await requireProjectMember(req, res, () => {
    if (req.membership.role !== "ADMIN" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(500).json({ message: "Server error" });
}

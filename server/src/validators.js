import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MEMBER"]).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required"),
  description: z.string().trim().max(500).optional().or(z.literal(""))
});

export const memberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

export const memberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"])
});

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Task title is required"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  assigneeId: z.string().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable().or(z.literal(""))
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  assigneeId: z.string().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional()
});

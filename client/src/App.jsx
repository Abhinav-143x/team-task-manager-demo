import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LogOut,
  Plus,
  Shield,
  Target,
  UserPlus,
  UsersRound,
  X
} from "lucide-react";
import { api } from "./api.js";

const emptyTask = { title: "", description: "", assigneeId: "", dueDate: "" };
const statuses = ["TODO", "IN_PROGRESS", "DONE"];

function statusLabel(status) {
  return status.replace("_", " ");
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "admin@example.com",
    password: "password123",
    role: "ADMIN"
  });
  const [error, setError] = useState("");

  function useDemo(email, role = "ADMIN") {
    setMode("login");
    setForm({
      name: "",
      email,
      password: "password123",
      role
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const payload =
        mode === "signup"
          ? form
          : { email: form.email, password: form.password };
      const data = await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem("token", data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <p className="eyebrow">Team Task Manager</p>
        <h1>Run project work from one sharp board.</h1>
        <div className="brand-grid">
          <span>REST API</span>
          <span>JWT Auth</span>
          <span>RBAC</span>
          <span>PostgreSQL</span>
        </div>
      </section>
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Secure access</p>
          <h2>{mode === "login" ? "Welcome back" : "Create workspace user"}</h2>
        </div>

        <div className="mode-switch" aria-label="Auth mode">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            Signup
          </button>
        </div>

        {mode === "login" && (
          <div className="demo-row">
            <button type="button" onClick={() => useDemo("admin@example.com", "ADMIN")}>
              Admin demo
            </button>
            <button type="button" onClick={() => useDemo("member@example.com", "MEMBER")}>
              Member demo
            </button>
          </div>
        )}

        <form onSubmit={submit} className="stack">
          {mode === "signup" && (
            <>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label>
                Role
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="admin@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="password123"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit">
            <Shield size={18} />
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ dashboard }) {
  const cards = [
    { label: "Projects", value: dashboard?.projects || 0, icon: FolderKanban, tone: "blue" },
    { label: "Tasks", value: dashboard?.totalTasks || 0, icon: CheckCircle2, tone: "green" },
    { label: "Overdue", value: dashboard?.overdue || 0, icon: Clock3, tone: "red" }
  ];

  return (
    <section className="metrics">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className={`metric ${card.tone}`} key={card.label}>
            <Icon size={20} />
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        );
      })}
      <article className="metric wide">
        <span>Status</span>
        <div className="status-bars">
          {statuses.map((status) => (
            <div key={status}>
              <small>{statusLabel(status)}</small>
              <b>{dashboard?.status?.[status] || 0}</b>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function ProjectList({ projects, selectedId, onSelect, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event) {
    event.preventDefault();
    await onCreate({ name, description });
    setName("");
    setDescription("");
  }

  return (
    <aside className="sidebar">
      <form className="new-project" onSubmit={submit}>
        <h2>Projects</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Short description"
        />
        <button className="primary" type="submit">
          <Plus size={16} />
          Add
        </button>
      </form>
      <div className="project-list">
        {projects.map((project) => (
          <button
            key={project.id}
            className={project.id === selectedId ? "project-link active" : "project-link"}
            onClick={() => onSelect(project.id)}
          >
            <span>{project.name}</span>
            <small>
              <Target size={13} />
              {project._count?.tasks || project.tasks?.length || 0} tasks
            </small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MemberPanel({ project, canAdmin, onAddMember, onRoleChange, onRemove }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");

  async function submit(event) {
    event.preventDefault();
    await onAddMember({ email, role });
    setEmail("");
    setRole("MEMBER");
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <UsersRound size={18} />
        <h3>Team</h3>
      </div>
      <div className="members">
        {project.members.map((member) => (
          <div className="member" key={member.id}>
            <div>
              <strong>{member.user.name}</strong>
              <small>{member.user.email}</small>
            </div>
            {canAdmin ? (
              <select
                value={member.role}
                onChange={(event) => onRoleChange(member.userId, event.target.value)}
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            ) : (
              <span className="pill">{member.role}</span>
            )}
            {canAdmin && (
              <button className="icon" onClick={() => onRemove(member.userId)} title="Remove member">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {canAdmin && (
        <form className="inline-form" onSubmit={submit}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@email.com" />
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="primary" type="submit">
            <UserPlus size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function TaskPanel({ project, user, canAdmin, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [task, setTask] = useState(emptyTask);

  async function submit(event) {
    event.preventDefault();
    await onCreateTask(task);
    setTask(emptyTask);
  }

  return (
    <section className="panel task-panel">
      <div className="panel-title">
        <CheckCircle2 size={18} />
        <h3>Tasks</h3>
      </div>
      {canAdmin && (
        <form className="task-form" onSubmit={submit}>
          <input
            value={task.title}
            onChange={(event) => setTask({ ...task, title: event.target.value })}
            placeholder="Task title"
          />
          <select
            value={task.assigneeId}
            onChange={(event) => setTask({ ...task, assigneeId: event.target.value })}
          >
            <option value="">Unassigned</option>
            {project.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={task.dueDate}
            onChange={(event) => setTask({ ...task, dueDate: event.target.value })}
          />
          <textarea
            value={task.description}
            onChange={(event) => setTask({ ...task, description: event.target.value })}
            placeholder="Description"
          />
          <button className="primary" type="submit">
            <Plus size={16} />
            Create Task
          </button>
        </form>
      )}

      <div className="tasks">
        {project.tasks.map((item) => {
          const canChange = canAdmin || item.assigneeId === user.id;
          const overdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "DONE";
          return (
            <article className={overdue ? "task overdue" : `task ${item.status.toLowerCase()}`} key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description || "No description"}</p>
                <small>
                  <CalendarDays size={13} />
                  {item.assignee ? item.assignee.name : "Unassigned"}
                  {item.dueDate ? ` - Due ${new Date(item.dueDate).toLocaleDateString()}` : ""}
                </small>
              </div>
              <select
                value={item.status}
                disabled={!canChange}
                onChange={(event) => onUpdateTask(item.id, { status: event.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              {canAdmin && <button className="ghost" onClick={() => onDeleteTask(item.id)}>Delete</button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canAdmin = useMemo(() => {
    if (!user || !selectedProject) return false;
    const membership = selectedProject.members.find((member) => member.userId === user.id);
    return user.role === "ADMIN" || membership?.role === "ADMIN";
  }, [user, selectedProject]);

  async function boot() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return setLoading(false);
      const me = await api("/api/me");
      setUser(me.user);
      await refreshAll();
    } catch {
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(nextSelectedId = selectedId) {
    const [dashData, projectData] = await Promise.all([
      api("/api/dashboard"),
      api("/api/projects")
    ]);
    setDashboard(dashData);
    setProjects(projectData.projects);
    const id = nextSelectedId || projectData.projects[0]?.id || "";
    setSelectedId(id);
    if (id) await loadProject(id);
  }

  async function loadProject(id) {
    const data = await api(`/api/projects/${id}`);
    setSelectedProject(data.project);
  }

  async function action(fn) {
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (selectedId) {
      action(() => loadProject(selectedId));
    }
  }, [selectedId]);

  if (loading) return <main className="loading">Loading...</main>;
  if (!user) return <AuthScreen onAuth={(nextUser) => { setUser(nextUser); refreshAll(); }} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Team Task Manager</h1>
        </div>
        <div className="user-chip">
          <Shield size={16} />
          <span>{user.name}</span>
          <b>{user.role}</b>
          <button
            className="icon"
            onClick={() => {
              localStorage.removeItem("token");
              setUser(null);
            }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <Dashboard dashboard={dashboard} />
      {error && <p className="error">{error}</p>}

      <section className="workspace">
        <ProjectList
          projects={projects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={(body) =>
            action(async () => {
              const data = await api("/api/projects", { method: "POST", body: JSON.stringify(body) });
              await refreshAll(data.project.id);
            })
          }
        />

        {selectedProject ? (
          <section className="detail">
            <div className="project-head">
              <div>
                <p className="eyebrow">Project</p>
                <h2>{selectedProject.name}</h2>
                <p>{selectedProject.description || "No description"}</p>
              </div>
              <span className="pill">{canAdmin ? "Admin access" : "Member access"}</span>
            </div>

            <div className="content-grid">
              <MemberPanel
                project={selectedProject}
                canAdmin={canAdmin}
                onAddMember={(body) =>
                  action(async () => {
                    const data = await api(`/api/projects/${selectedProject.id}/members`, {
                      method: "POST",
                      body: JSON.stringify(body)
                    });
                    setSelectedProject(data.project);
                    await refreshAll(selectedProject.id);
                  })
                }
                onRoleChange={(userId, role) =>
                  action(async () => {
                    const data = await api(`/api/projects/${selectedProject.id}/members/${userId}`, {
                      method: "PATCH",
                      body: JSON.stringify({ role })
                    });
                    setSelectedProject(data.project);
                  })
                }
                onRemove={(userId) =>
                  action(async () => {
                    const data = await api(`/api/projects/${selectedProject.id}/members/${userId}`, {
                      method: "DELETE"
                    });
                    setSelectedProject(data.project);
                    await refreshAll(selectedProject.id);
                  })
                }
              />

              <TaskPanel
                project={selectedProject}
                user={user}
                canAdmin={canAdmin}
                onCreateTask={(body) =>
                  action(async () => {
                    const data = await api(`/api/projects/${selectedProject.id}/tasks`, {
                      method: "POST",
                      body: JSON.stringify(body)
                    });
                    setSelectedProject(data.project);
                    await refreshAll(selectedProject.id);
                  })
                }
                onUpdateTask={(taskId, body) =>
                  action(async () => {
                    const data = await api(`/api/tasks/${taskId}`, {
                      method: "PATCH",
                      body: JSON.stringify(body)
                    });
                    setSelectedProject(data.project);
                    await refreshAll(selectedProject.id);
                  })
                }
                onDeleteTask={(taskId) =>
                  action(async () => {
                    const data = await api(`/api/tasks/${taskId}`, { method: "DELETE" });
                    setSelectedProject(data.project);
                    await refreshAll(selectedProject.id);
                  })
                }
              />
            </div>
          </section>
        ) : (
          <section className="empty-state">
            <FolderKanban size={36} />
            <h2>Create a project to start.</h2>
          </section>
        )}
      </section>
    </main>
  );
}

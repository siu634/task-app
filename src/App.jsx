import React, { useEffect, useMemo, useState } from "react";

/**
 * 副業受けを意識したタスク管理アプリ（導入簡単版）
 * - 追加 / 編集 / 削除（CRUD）
 * - 検索 / ステータス絞り込み / 優先度絞り込み
 * - localStorage 永続化
 * - 入力バリデーション
 * - 依存ライブラリなし（Reactのみ）
 */

const STORAGE_KEY = "portfolio_task_manager_simple_v1";

const emptyForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
};

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ja-JP");
}

function StatusPill({ status }) {
  const map = {
    todo: { label: "未着手", bg: "#e2e8f0", color: "#334155" },
    doing: { label: "進行中", bg: "#dbeafe", color: "#1d4ed8" },
    done: { label: "完了", bg: "#dcfce7", color: "#15803d" },
  };
  const s = map[status] || map.todo;
  return (
    <span style={{ ...styles.pill, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function PriorityPill({ priority }) {
  const map = {
    low: { label: "低", bg: "#f3f4f6", color: "#374151" },
    medium: { label: "中", bg: "#fef3c7", color: "#b45309" },
    high: { label: "高", bg: "#ffe4e6", color: "#be123c" },
  };
  const p = map[priority] || map.medium;
  return (
    <span style={{ ...styles.pill, background: p.bg, color: p.color }}>
      {p.label}
    </span>
  );
}

function TaskFormModal({ open, mode, initialTask, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(
      initialTask
        ? {
            title: initialTask.title || "",
            description: initialTask.description || "",
            status: initialTask.status || "todo",
            priority: initialTask.priority || "medium",
            dueDate: initialTask.dueDate || "",
          }
        : emptyForm
    );
    setErrors({});
  }, [open, initialTask]);

  if (!open) return null;

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "タイトルは必須です";
    if (form.title.trim().length > 50)
      next.title = "タイトルは50文字以内で入力してください";
    if ((form.description || "").length > 300)
      next.description = "説明は300文字以内で入力してください";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0 }}>{mode === "edit" ? "タスク編集" : "タスク追加"}</h3>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>タイトル *</label>
            <input
              style={styles.input}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="例）案件Aの要件整理"
            />
            {errors.title && <div style={styles.error}>{errors.title}</div>}
          </div>

          <div>
            <label style={styles.label}>説明</label>
            <textarea
              style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="作業内容やメモ"
            />
            {errors.description && <div style={styles.error}>{errors.description}</div>}
          </div>

          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>ステータス</label>
              <select
                style={styles.input}
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="todo">未着手</option>
                <option value="doing">進行中</option>
                <option value="done">完了</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>優先度</label>
              <select
                style={styles.input}
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>期限</label>
              <input
                style={styles.input}
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.secondaryBtn} onClick={onClose}>キャンセル</button>
          <button style={styles.primaryBtn} onClick={handleSubmit}>
            {mode === "edit" ? "更新する" : "追加する"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    const loaded = loadTasks();
    if (loaded.length > 0) {
      setTasks(loaded);
      return;
    }

    const now = new Date().toISOString();
    const seed = [
      {
        id: uid(),
        title: "ReactポートフォリオのREADME作成",
        description: "機能一覧、技術構成、工夫点、改善予定を整理して記載する",
        status: "doing",
        priority: "high",
        dueDate: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid(),
        title: "副業応募文の作成",
        description: "業務想定の実装ポイント（CRUD/絞り込み/バリデーション）を整理",
        status: "todo",
        priority: "medium",
        dueDate: "",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid(),
        title: "Vercelにデプロイ",
        description: "公開URLを作ってGitHub READMEに掲載する",
        status: "done",
        priority: "medium",
        dueDate: "",
        createdAt: now,
        updatedAt: now,
      },
    ];
    setTasks(seed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (!q) return true;
        return (
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
        );
      })
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === "all" ? true : t.priority === priorityFilter))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, search, statusFilter, priorityFilter]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      doing: tasks.filter((t) => t.status === "doing").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks]
  );

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSubmitForm = (payload) => {
    const now = new Date().toISOString();

    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id ? { ...t, ...payload, updatedAt: now } : t
        )
      );
    } else {
      const newTask = {
        id: uid(),
        ...payload,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    setModalOpen(false);
    setEditingTask(null);
  };

  const deleteTask = (id) => {
    const ok = window.confirm("このタスクを削除しますか？");
    if (!ok) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleDone = (task) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: t.status === "done" ? "todo" : "done", updatedAt: now }
          : t
      )
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>タスク管理アプリ（副業ポートフォリオ向け）</h1>
            <p style={styles.subtitle}>
              React / CRUD / 検索 / 絞り込み / localStorage / バリデーション
            </p>
          </div>
          <button style={styles.primaryBtn} onClick={openCreate}>
            ＋ タスク追加
          </button>
        </header>

        <section style={styles.statsGrid}>
          <StatCard label="全体" value={stats.total} />
          <StatCard label="未着手" value={stats.todo} />
          <StatCard label="進行中" value={stats.doing} />
          <StatCard label="完了" value={stats.done} />
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>検索・絞り込み</h2>
          <div style={styles.filterGrid}>
            <input
              style={styles.input}
              placeholder="タイトル・説明で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={styles.input}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全ステータス</option>
              <option value="todo">未着手</option>
              <option value="doing">進行中</option>
              <option value="done">完了</option>
            </select>
            <select
              style={styles.input}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">全優先度</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>タスク一覧（{filteredTasks.length}件）</h2>

          {filteredTasks.length === 0 ? (
            <div style={styles.empty}>条件に一致するタスクがありません</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredTasks.map((task) => (
                <div key={task.id} style={styles.taskCard}>
                  <div style={styles.taskMain}>
                    <button
                      style={styles.checkBtn}
                      onClick={() => toggleDone(task)}
                      title="完了切り替え"
                    >
                      {task.status === "done" ? "✅" : "◻️"}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.taskTopRow}>
                        <div
                          style={{
                            ...styles.taskTitle,
                            ...(task.status === "done" ? styles.taskTitleDone : {}),
                          }}
                        >
                          {task.title}
                        </div>
                        <StatusPill status={task.status} />
                        <PriorityPill priority={task.priority} />
                      </div>

                      <div style={styles.taskDescription}>
                        {task.description || "説明なし"}
                      </div>

                      <div style={styles.metaRow}>
                        <span>期限: {formatDate(task.dueDate)}</span>
                        <span>更新: {formatDate(task.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.actionRow}>
                    <button style={styles.secondaryBtn} onClick={() => openEdit(task)}>
                      編集
                    </button>
                    <button style={styles.dangerBtn} onClick={() => deleteTask(task.id)}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>ポートフォリオで説明しやすいポイント</h2>
          <ul style={styles.list}>
            <li>状態管理（useState / useMemo / useEffect）</li>
            <li>フォーム入力 + バリデーション</li>
            <li>一覧表示・検索・絞り込み・更新順ソート</li>
            <li>CRUD（追加 / 編集 / 削除）</li>
            <li>localStorageによる永続化</li>
          </ul>
        </section>

        <TaskFormModal
          open={modalOpen}
          mode={editingTask ? "edit" : "create"}
          initialTask={editingTask}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSubmitForm}
        />
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: 16,
    color: "#0f172a",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: 1000,
    margin: "0 auto",
    display: "grid",
    gap: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.2,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 14,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 13,
  },
  statValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: 700,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: 18,
  },
  filterGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a",
  },
  taskCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    display: "grid",
    gap: 10,
  },
  taskMain: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  checkBtn: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 10,
    padding: "6px 8px",
    cursor: "pointer",
  },
  taskTopRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  taskTitle: {
    fontWeight: 700,
    fontSize: 15,
    marginRight: 2,
  },
  taskTitleDone: {
    color: "#94a3b8",
    textDecoration: "line-through",
  },
  taskDescription: {
    marginTop: 8,
    color: "#475569",
    fontSize: 14,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  metaRow: {
    marginTop: 8,
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 12,
  },
  actionRow: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  primaryBtn: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  dangerBtn: {
    border: "1px solid #fecdd3",
    background: "#fff1f2",
    color: "#be123c",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
  },
  empty: {
    padding: "28px 12px",
    textAlign: "center",
    color: "#64748b",
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
    background: "#f8fafc",
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    color: "#334155",
    lineHeight: 1.8,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "grid",
    placeItems: "center",
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: "min(760px, 100%)",
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 50px rgba(15,23,42,0.2)",
    padding: 14,
  },
  modalHeader: {
    marginBottom: 8,
  },
  formGrid: {
    display: "grid",
    gap: 12,
  },
  grid3: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    color: "#334155",
    fontWeight: 600,
  },
  error: {
    marginTop: 6,
    color: "#dc2626",
    fontSize: 12,
  },
  modalFooter: {
    marginTop: 12,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
};

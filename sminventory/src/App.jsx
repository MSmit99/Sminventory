import { useState } from "react";
import { Sidebar }          from "./components/layout/Sidebar";
import { Header }           from "./components/layout/Header";
import { StatCard }         from "./components/ui/StatCard";
import { AlertBanner }      from "./components/ui/AlertBanner";
import { FilterBar }        from "./components/ui/FilterBar";
import { InventoryGrid }    from "./components/inventory/InventoryGrid";
import { InventoryList }    from "./components/inventory/InventoryList";
import { AddEditModal }     from "./components/modals/AddEditModal";
import { DeleteModal }      from "./components/modals/DeleteModal";
import { BulkDeleteModal }  from "./components/modals/BulkDeleteModal";
import { AuthPage }         from "./components/auth/AuthPage";
import { HouseholdPage }    from "./components/auth/HouseholdPage";
import { useAuth }          from "./hooks/useAuth";
import { useHousehold }     from "./hooks/useHousehold";
import { useInventory }     from "./hooks/useInventory";
import { useDarkMode }      from "./hooks/useDarkMode";
import { getStatus }        from "./utils/statusUtils";
import { EMPTY_FORM }       from "./constants/categories";

function PlaceholderPage({ title, description }) {
  return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: "var(--text-primary)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>{description}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 16px", display: "inline-block" }}>Coming soon</div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <span>Loading...</span>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { household, members, loading: hhLoading, createHousehold, joinHousehold } = useHousehold(user);
  const { items, stats, expiringItems, loading: itemsLoading, addItem, updateItem, deleteItem, deleteItems } = useInventory(household?.id, user);
  const [dark, setDark] = useDarkMode();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav,   setActiveNav]   = useState("inventory");
  const [view,        setView]        = useState("grid");

  // Filters & search
  const [search,         setSearch]         = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [sortBy,         setSortBy]         = useState("expiration");

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [modal,        setModal]        = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);

  // --- Auth loading ---
  if (authLoading) return <LoadingScreen />;

  // --- Not logged in ---
  if (!user) return <AuthPage onSignIn={signIn} onSignUp={signUp} />;

  // --- Logged in but no household ---
  if (hhLoading) return <LoadingScreen />;
  if (!household) return (
    <HouseholdPage
      user={user}
      onCreate={createHousehold}
      onJoin={joinHousehold}
      onSignOut={signOut}
    />
  );

  // --- Derived inventory ---
  // Note: Supabase uses snake_case (expiration_date), map to camelCase for components
  const mappedItems = items.map(i => ({
    ...i,
    expirationDate: i.expiration_date,
    addedBy:        i.added_by_name,
    dateAdded:      i.created_at,
  }));

  const filtered = (() => {
    let result = [...mappedItems];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) || (i.brand || "").toLowerCase().includes(q)
      );
    }
    if (filterCategory !== "All") result = result.filter(i => i.category === filterCategory);
    if (filterLocation !== "All") result = result.filter(i => i.location === filterLocation);
    if (filterStatus   !== "All") {
      const key = filterStatus.toLowerCase().replace(" ", "");
      result = result.filter(i => getStatus(i.expirationDate).key === key);
    }
    result.sort((a, b) => {
      if (sortBy === "expiration") return new Date(a.expirationDate) - new Date(b.expirationDate);
      if (sortBy === "name")       return a.name.localeCompare(b.name);
      if (sortBy === "dateAdded")  return new Date(b.dateAdded) - new Date(a.dateAdded);
      return 0;
    });
    return result;
  })();

  // --- Handlers ---
  function openAdd() { setForm(EMPTY_FORM); setModal("add"); }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      name:           item.name,
      category:       item.category,
      quantity:       item.quantity,
      unit:           item.unit,
      expirationDate: item.expirationDate,
      location:       item.location,
      brand:          item.brand  || "",
      notes:          item.notes  || "",
    });
    setModal("edit");
  }

  function openDelete(item) { setDeleteTarget(item); setModal("delete"); }

  function handleFormChange(key, value) { setForm(f => ({ ...f, [key]: value })); }

  async function handleSave() {
    try {
      if (modal === "add") await addItem(form);
      else                  await updateItem(editTarget.id, form);
      setModal(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete() {
    try {
      await deleteItem(deleteTarget.id);
      setDeleteTarget(null);
      setModal(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBulkDelete() {
    try {
      await deleteItems(selected);
      setSelected(new Set());
      setModal(null);
    } catch (err) {
      console.error(err);
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll()   { setSelected(new Set(filtered.map(i => i.id))); }
  function clearSelect() { setSelected(new Set()); }

  const statCards = [
    { label: "Total Items",   value: stats.total,        accent: "var(--accent)" },
    { label: "Fresh",         value: stats.fresh,        accent: "var(--status-fresh-border)" },
    { label: "Expiring Soon", value: stats.expiringSoon, accent: "var(--status-warning-border)" },
    { label: "Expired",       value: stats.expired,      accent: "var(--status-expired-border)" },
  ];

  return (
    <div className="app-shell">
      <Sidebar
        activeNav={activeNav}
        onNav={setActiveNav}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        alertCount={expiringItems.length}
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
        household={household}
        members={members}
        user={user}
        onSignOut={signOut}
      />

      <div className="main-content">
        <Header
          activeNav={activeNav}
          onMenuOpen={() => setSidebarOpen(true)}
          onAddItem={openAdd}
        />

        <div className="page-body">

          {/* Inventory */}
          {activeNav === "inventory" && (
            <>
              <AlertBanner items={expiringItems} />

              <div className="stats-row">
                {statCards.map(s => <StatCard key={s.label} {...s} />)}
              </div>

              <FilterBar
                search={search}                 onSearch={setSearch}
                filterCategory={filterCategory} onCategory={setFilterCategory}
                filterLocation={filterLocation} onLocation={setFilterLocation}
                filterStatus={filterStatus}     onStatus={setFilterStatus}
                sortBy={sortBy}                 onSort={setSortBy}
                view={view}                     onView={setView}
              />

              {selected.size > 0 && (
                <div className="bulk-bar">
                  <span className="bulk-bar__count">{selected.size} selected</span>
                  <button className="btn-ghost" onClick={clearSelect}>Clear</button>
                  <button className="btn-ghost" onClick={selectAll}>Select All</button>
                  <button className="btn-danger bulk-bar__delete" onClick={() => setModal("bulk")}>
                    Delete Selected
                  </button>
                </div>
              )}

              {itemsLoading ? (
                <div className="loading-screen" style={{ minHeight: 200 }}>
                  <div className="loading-spinner" />
                </div>
              ) : view === "grid" ? (
                <InventoryGrid
                  items={filtered}
                  selected={selected}
                  onSelect={toggleSelect}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              ) : (
                <InventoryList
                  items={filtered}
                  selected={selected}
                  onSelectAll={selectAll}
                  onClearAll={clearSelect}
                  onSelect={toggleSelect}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              )}
            </>
          )}

          {activeNav === "alerts" && (
            <PlaceholderPage title="Alerts" description="View all items expiring soon or already expired." />
          )}
          {activeNav === "shopping" && (
            <PlaceholderPage title="Shopping List" description="Auto-generated list from expired and depleted items." />
          )}
          {activeNav === "meals" && (
            <PlaceholderPage title="Meal Ideas" description="Meal suggestions based on your current inventory." />
          )}
          {activeNav === "history" && (
            <PlaceholderPage title="History" description="Log of all items added, edited, and removed." />
          )}

        </div>
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <AddEditModal
          mode={modal}
          form={form}
          onChange={handleFormChange}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "delete" && (
        <DeleteModal
          itemName={deleteTarget?.name}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "bulk" && (
        <BulkDeleteModal
          count={selected.size}
          onConfirm={handleBulkDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
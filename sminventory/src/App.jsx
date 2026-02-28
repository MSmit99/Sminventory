import { useState, useMemo } from "react";
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
import { useInventory }     from "./hooks/useInventory";
import { useDarkMode }      from "./hooks/useDarkMode";
import { getStatus }        from "./utils/statusUtils";
import { EMPTY_FORM }       from "./constants/categories";

export default function App() {
  const { items, stats, expiringItems, addItem, updateItem, deleteItem, deleteItems } = useInventory();
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
  const [modal,        setModal]        = useState(null); // "add"|"edit"|"delete"|"bulk"
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);

  // --- Derived ---
  const filtered = useMemo(() => {
    let result = [...items];

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
  }, [items, search, filterCategory, filterLocation, filterStatus, sortBy]);

  // --- Handlers ---
  function openAdd() {
    setForm(EMPTY_FORM);
    setModal("add");
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      name: item.name, category: item.category, quantity: item.quantity,
      unit: item.unit, expirationDate: item.expirationDate,
      location: item.location, brand: item.brand || "", notes: item.notes || "",
    });
    setModal("edit");
  }

  function openDelete(item) {
    setDeleteTarget(item);
    setModal("delete");
  }

  function handleFormChange(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (modal === "add") addItem(form);
    else                  updateItem(editTarget.id, form);
    setModal(null);
  }

  function handleDelete() {
    deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    setModal(null);
  }

  function handleBulkDelete() {
    deleteItems(selected);
    setSelected(new Set());
    setModal(null);
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll()  { setSelected(new Set(filtered.map(i => i.id))); }
  function clearSelect() { setSelected(new Set()); }

  // --- Stat definitions ---
  const statCards = [
    { label: "Total Items",    value: stats.total,        accent: "var(--accent)" },
    { label: "Fresh",          value: stats.fresh,        accent: "var(--status-fresh-border)" },
    { label: "Expiring Soon",  value: stats.expiringSoon, accent: "var(--status-warning-border)" },
    { label: "Expired",        value: stats.expired,      accent: "var(--status-expired-border)" },
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
      />

      <div className="main-content">
        <Header
          activeNav={activeNav}
          onMenuOpen={() => setSidebarOpen(true)}
          onAddItem={openAdd}
        />

        <div className="page-body">
          <AlertBanner items={expiringItems} />

          {/* Stats */}
          <div className="stats-row">
            {statCards.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          <FilterBar
            search={search}           onSearch={setSearch}
            filterCategory={filterCategory} onCategory={setFilterCategory}
            filterLocation={filterLocation} onLocation={setFilterLocation}
            filterStatus={filterStatus}     onStatus={setFilterStatus}
            sortBy={sortBy}           onSort={setSortBy}
            view={view}               onView={setView}
          />

          {/* Bulk action bar */}
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

          {/* Inventory */}
          {view === "grid" ? (
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

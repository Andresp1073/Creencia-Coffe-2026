"use client";

import { useState, useEffect } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  active: boolean;
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const url = "/api/admin/categories";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });

      if (!res.ok) throw new Error("Error guardando");

      if (editingId) {
        setCategories(categories.map(c => c.id === editingId ? { ...c, ...form } : c));
      } else {
        const newId = Math.max(...categories.map(c => c.id), 0) + 1;
        setCategories([...categories, { ...form, id: newId, slug: form.name.toLowerCase().replace(/\s+/g, '-') }]);
      }

      resetForm();
      alert(editingId ? "Categoría actualizada" : "Categoría creada");
    } catch (error) {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setForm({ name: cat.name, active: cat.active });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    
    try {
      await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      setCategories(categories.filter(c => c.id !== id));
      alert("Categoría eliminada");
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cat, active: !cat.active }),
      });
      setCategories(categories.map(c => c.id === cat.id ? { ...c, active: !c.active } : c));
      alert(cat.active ? "Categoría ocultada" : "Categoría activada");
    } catch (error) {
      alert("Error al actualizar");
    }
  };

  const resetForm = () => {
    setForm({ name: "", active: true });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-dark"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-foreground">Categorías</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona las categorías de productos</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-coffee-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-coffee-dark/90 transition-smooth"
        >
          + Nueva Categoría
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-lg p-6 w-full max-w-md border border-border">
            <h2 className="font-display text-xl mb-4">
              {editingId ? "Editar Categoría" : "Nueva Categoría"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sage"
                  placeholder="Ej: Café Tradicional"
                  required
                />
              </div>

              {editingId && (
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-sage focus:ring-sage"
                  />
                  <label htmlFor="active" className="text-sm text-foreground">Activa</label>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-coffee-dark text-white py-2 rounded-lg font-medium hover:bg-coffee-dark/90 transition-smooth disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-smooth"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Slug</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Estado</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{cat.slug}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${cat.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {cat.active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="text-sage hover:underline text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggle(cat)}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      {cat.active ? "Ocultar" : "Mostrar"}
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay categorías. Crea una nueva.
          </div>
        )}
      </div>
    </div>
  );
}
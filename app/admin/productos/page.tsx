"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Eye, EyeOff, Trash2, X, Loader2, Image, Upload } from "lucide-react";
import { formatCOP } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  category_id?: number;
  presentation: string;
  price: number;
  price_500g?: number;
  price_250g?: number;
  price_125g?: number;
  image: string;
  stock: number;
  active: boolean;
  featured: boolean;
  description?: string;
}

const presentations = ["500g", "250g", "125g"];

const defaultImage = "/imagenes/default-producto.jpg";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string>(defaultImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    category_id: 1,
    presentation: "500g" as string,
    price: "",
    price_500g: "",
    price_250g: "",
    price_125g: "",
    stock: "",
    description: "",
    image: defaultImage,
    featured: false,
  });

  // Load products and categories on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/products', { credentials: "include" }).then(res => res.json()),
      fetch('/api/admin/categories', { credentials: "include" }).then(res => res.json())
    ])
      .then(([productsData, categoriesData]) => {
        if (productsData.products) {
          setProducts(productsData.products);
        } else if (Array.isArray(productsData)) {
          setProducts(productsData);
        }
        if (categoriesData.categories) {
          setCategories(categoriesData.categories);
        }
      })
      .catch(err => console.error('Error cargando datos:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Upload the file to server
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          credentials: "include",
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          setImagePreview(data.url);
          setForm({ ...form, image: data.url });
        } else {
          // Fallback to base64 if upload fails
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
            setForm({ ...form, image: reader.result as string });
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        // Fallback to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setForm({ ...form, image: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Usar la imagen directamente del form - ya viene como base64 del handleImageChange
    const imageUrl = form.image || defaultImage;

    const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "producto-" + Date.now();
    
    const productData: Product = {
      id: editingId || 0,
      name: form.name,
      slug,
      category_id: form.category_id,
      category: categories.find(c => c.id === form.category_id)?.name || "Café",
      presentation: form.presentation,
      price: Number(form.price_500g) || Number(form.price) || 0,
      price_500g: Number(form.price_500g) || 0,
      price_250g: 0,
      price_125g: 0,
      stock: Number(form.stock),
      description: form.description,
      image: imageUrl,
      featured: form.featured,
      active: true,
    };

    try {
      const url = editingId ? '/api/admin/products' : '/api/admin/products';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify(productData)
      });

      if (!res.ok) throw new Error('Error guardando');

      if (editingId) {
        setProducts(products.map(p => p.id === editingId ? { ...p, ...productData } : p));
      } else {
        // Reload products to get the 3 new ones created
        const productsRes = await fetch('/api/admin/products', { credentials: "include" });
        const productsData = await productsRes.json();
        if (productsData.products) {
          setProducts(productsData.products);
        }
      }
      alert(editingId ? "Producto actualizado" : "Producto creado");
      resetForm();
    } catch (error) {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setImagePreview(null);
    setOriginalImage(defaultImage);
    setForm({
      name: "",
      category_id: 1,
      presentation: "500g",
      price: "",
      price_500g: "",
      price_250g: "",
      price_125g: "",
      stock: "",
      description: "",
      image: defaultImage,
      featured: false,
    });
  };

  const handleEdit = (product: Product) => {
    const categoryId = (product as any).category_id || categories.find(c => c.name === product.category)?.id || 1;
    setForm({
      name: product.name,
      category_id: categoryId,
      presentation: product.presentation,
      price: String(product.price),
      price_500g: String(product.price_500g || product.price),
      price_250g: String(product.price_250g || Math.round(product.price * 0.55)),
      price_125g: String(product.price_125g || Math.round(product.price * 0.3)),
      stock: String(product.stock),
      description: product.description || "",
      image: product.image,
      featured: product.featured,
    });
    setImagePreview(product.image);
    setOriginalImage(product.image || defaultImage);
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleToggle = async (id: number, currentActive: boolean) => {
    const newActive = !currentActive;
    setToggling(id);
    try {
      await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...products.find(p => p.id === id), active: newActive })
      });
      setProducts(products.map(p => p.id === id ? { ...p, active: newActive } : p));
    } catch {
      alert("Error al actualizar");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      setProducts(products.filter(p => p.id !== id));
      alert("Producto eliminado");
    } catch {
      alert("Error al eliminar");
    }
  };

  const getStockStatus = (product: Product) => {
    if (!product.active) return { label: "No activo", variant: "muted" };
    if (product.stock === 0) return { label: "Sin stock", variant: "danger" };
    if (product.stock < 10) return { label: "Stock bajo", variant: "warning" };
    return { label: "Activo", variant: "success" };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Productos</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu catálogo y precios</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-warm text-cream text-sm font-medium shadow-soft hover:shadow-warm transition-smooth"
        >
          <Plus className="size-4" /> Crear producto
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
        {products.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground">
            No hay productos. Crea uno nuevo.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/50 bg-muted/30">
                  <th className="px-4 sm:px-6 py-3.5 font-normal">Producto</th>
                  <th className="px-4 sm:px-6 py-3.5 font-normal hidden lg:table-cell">Categoría</th>
                  <th className="px-4 sm:px-6 py-3.5 font-normal">Presentación</th>
                  <th className="px-4 sm:px-6 py-3.5 font-normal text-right">Precio</th>
                  <th className="px-4 sm:px-6 py-3.5 font-normal text-right">Stock</th>
                  <th className="px-4 sm:px-6 py-3.5 font-normal">Estado</th>
                  <th className="px-4 sm:px-6 py-3.5 font-normal text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const status = getStockStatus(p);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors ${!p.active ? "opacity-60 bg-muted/10" : ""}`}
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image || defaultImage}
                            alt={p.name}
                            className="size-9 sm:size-11 rounded-lg object-cover"
                          />
                          <span className="font-medium text-foreground text-sm sm:text-base line-clamp-1">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-muted-foreground hidden lg:table-cell">{p.category}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-muted-foreground">{p.presentation}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-medium text-coffee-dark">
                        {formatCOP(p.price)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right tabular-nums">{p.stock}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                          status.variant === "success" ? "bg-green-100 text-green-700" :
                          status.variant === "warning" ? "bg-yellow-100 text-yellow-700" :
                          status.variant === "danger" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleEdit(p)}
                            className="size-7 sm:size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
                            title="Editar producto"
                          >
                            <Pencil className="size-4" strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => handleToggle(p.id, p.active)}
                            disabled={toggling !== null}
                            className="size-7 sm:size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth disabled:opacity-50"
                            title={p.active ? "Ocultar producto" : "Mostrar producto"}
                          >
                            {toggling === p.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : p.active ? (
                              <EyeOff className="size-4" strokeWidth={1.75} />
                            ) : (
                              <Eye className="size-4" strokeWidth={1.75} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="size-8 rounded-md hover:bg-red-50 flex items-center justify-center text-red-500 transition-smooth"
                            title="Eliminar producto"
                          >
                            <Trash2 className="size-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">
                  {editingId ? "Editar producto" : "Nuevo producto"}
                </h2>
                <button
                  onClick={resetForm}
                  className="size-8 rounded-full hover:bg-muted flex items-center justify-center"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Image Upload Section */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-2">Imagen del producto</label>
                  <div 
                    className="aspect-square rounded-xl bg-muted overflow-hidden relative cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview || form.image ? (
                      <img 
                        src={imagePreview || form.image} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Upload className="size-10 mb-2" />
                        <span className="text-sm">Subir imagen</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {(imagePreview || form.image) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setForm({ ...form, image: defaultImage });
                      }}
                      className="text-xs text-red-500 mt-2 hover:underline"
                    >
                      Eliminar imagen
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre del producto *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Café Tostado Medio"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-sage focus:ring-1 focus:ring-sage outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Categoría</label>
                      <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-sage focus:ring-1 focus:ring-sage outline-none"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Presentación</label>
                      <select
                        value={form.presentation}
                        onChange={(e) => setForm({ ...form, presentation: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-sage focus:ring-1 focus:ring-sage outline-none"
                      >
                        <option value="500g">500g</option>
                        <option value="250g">250g</option>
                        <option value="125g">125g</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Precio (COP) *</label>
                      <input
                        type="number"
                        value={form.price_500g}
                        onChange={(e) => setForm({ ...form, price_500g: e.target.value, price: e.target.value })}
                        placeholder="25000"
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-sage focus:ring-1 focus:ring-sage outline-none"
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Stock *</label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        placeholder="50"
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-sage focus:ring-1 focus:ring-sage outline-none"
                        required
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Descripción</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descripción del producto..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-sage focus:ring-1 focus:ring-sage outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-sage focus:ring-sage"
                    />
                    <label htmlFor="featured" className="text-sm">Producto destacado (aparece en inicio)</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name || !form.price_500g || !form.stock}
                  className="px-6 py-2.5 rounded-xl bg-coffee-dark text-cream font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingId ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
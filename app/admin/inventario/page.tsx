export default function AdminInventoryPage() {
  // Mock inventory data - replace with actual DB query
  const movements = [
    { id: 1, date: "2026-05-03", type: "entrada", product: "Café Tostado Medio 500g", quantity: 20, reason: "Compra proveedor" },
    { id: 2, date: "2026-05-02", type: "salida", product: "Café Suave 250g", quantity: 5, reason: "Venta" },
    { id: 3, date: "2026-05-01", type: "entrada", product: "Café Molido 125g", quantity: 30, reason: "Compra proveedor" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Inventario</h1>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sage text-sage font-medium hover:bg-sage/10 transition-smooth">
            + Entrada
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-coffee-dark text-coffee-dark font-medium hover:bg-coffee-dark/10 transition-smooth">
            + Salida
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Producto</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cantidad</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Razón</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">{m.date}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    m.type === "entrada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {m.type === "entrada" ? "Entrada" : "Salida"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{m.product}</td>
                <td className="px-4 py-3 text-sm font-medium">{m.quantity}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
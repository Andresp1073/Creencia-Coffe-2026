export default function AdminSalesPage() {
  // Mock sales data - replace with actual DB query
  const sales = [
    { id: 1, date: "2026-05-03", product: "Café Tostado Medio 500g", quantity: 2, total: 50000 },
    { id: 2, date: "2026-05-02", product: "Café Suave 250g", quantity: 1, total: 15000 },
    { id: 3, date: "2026-05-01", product: "Café Molido 125g", quantity: 3, total: 33000 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Ventas</h1>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-coffee-dark text-cream font-medium shadow-soft hover:shadow-warm transition-smooth">
          + Nueva venta
        </button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Producto</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cantidad</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">#{sale.id}</td>
                <td className="px-4 py-3 text-sm">{sale.date}</td>
                <td className="px-4 py-3 text-sm">{sale.product}</td>
                <td className="px-4 py-3 text-sm">{sale.quantity}</td>
                <td className="px-4 py-3 text-sm font-medium text-right">
                  ${sale.total.toLocaleString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
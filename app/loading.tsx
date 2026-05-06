export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-sage/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-sage/30 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    </div>
  );
}
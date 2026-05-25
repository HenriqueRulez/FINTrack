export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Visão Geral</h1>
      <p className="text-muted-foreground text-sm mb-6">Bem-vindo ao FINTrack</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/50 p-5 neon-border-primary">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Patrimônio Total
          </p>
          <p className="text-3xl font-bold tabular-nums text-foreground neon-primary-text">
            R$ 0,00
          </p>
          <p className="text-xs text-muted-foreground mt-1">Valor atual do portfólio</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Posições
          </p>
          <p className="text-3xl font-bold tabular-nums text-foreground">0</p>
          <p className="text-xs text-muted-foreground mt-1">Ativos em carteira</p>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border/50 rounded-xl p-4 text-sm text-muted-foreground">
        <hr className="neon-divider mb-3" />
        Comece adicionando posições ao seu portfólio para ver os dados aqui.
      </div>
    </div>
  );
}

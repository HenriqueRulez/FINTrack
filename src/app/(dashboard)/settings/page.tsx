import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/settings/logout-button";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Configurações</h1>
      <p className="text-muted-foreground text-sm mb-6">Perfil e preferências</p>

      {/* Card — Perfil */}
      <div className="bg-card rounded-xl border border-border/50 p-6 max-w-lg w-full">
        <hr className="neon-divider mb-5" />
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">E-mail</p>
          <p className="font-medium text-foreground">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ID da conta</p>
          <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
        </div>
      </div>

      {/* Card — Sessão */}
      <div className="bg-card rounded-xl border border-border/50 p-6 max-w-lg w-full mt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">Sessão</p>
        <p className="text-sm text-muted-foreground mb-4">
          Termina a sessão actual neste dispositivo. Podes iniciar sessão novamente a qualquer momento.
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}

import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Configurações</h1>
      <p className="text-gray-500 mb-6">Perfil e preferências</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <div className="mb-4">
          <p className="text-sm text-gray-500">E-mail</p>
          <p className="font-medium text-gray-900">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ID da conta</p>
          <p className="font-mono text-xs text-gray-400">{user.id}</p>
        </div>
      </div>
    </div>
  );
}

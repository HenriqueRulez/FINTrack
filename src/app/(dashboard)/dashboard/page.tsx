export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Visão Geral</h1>
      <p className="text-gray-500 mb-6">Bem-vindo ao FINTrack</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Patrimônio Total</p>
          <p className="text-2xl font-bold text-gray-900">R$ 0,00</p>
          <p className="text-xs text-gray-400 mt-1">Valor atual do portfólio</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Posições</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">Stocks e ETFs em carteira</p>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        Comece adicionando posições ao seu portfólio para ver os dados aqui.
      </div>
    </div>
  );
}

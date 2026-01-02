export default function MainLayoutLoading() {
    // Sidebar não deve aparecer aqui - ele está no layout e não recarrega
    // Apenas mostrar skeleton do conteúdo principal
    return (
        <div className="flex-1 overflow-auto">
            <div className="h-16 bg-white border-b border-gray-200">
                <div className="h-full flex items-center px-6">
                    <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
                </div>
            </div>
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}


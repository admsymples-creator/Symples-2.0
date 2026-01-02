export default function MainLayoutLoading() {
    return (
        <div className="min-h-screen bg-white">
            <div className="h-16 bg-white border-b border-gray-200">
                <div className="h-full flex items-center px-6">
                    <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
                </div>
            </div>
            <main className="p-6">
                <div className="max-w-7xl mx-auto space-y-3">
                    <div className="h-4 w-56 bg-gray-100 animate-pulse rounded" />
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

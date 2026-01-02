export default function HomePageLoading() {
    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
                        <div className="h-5 w-96 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            <div className="w-full bg-white px-6">
                <div className="max-w-[1600px] mx-auto py-3">
                    <div className="space-y-6">
                        <div className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
                            <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



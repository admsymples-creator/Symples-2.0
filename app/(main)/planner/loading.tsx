export default function PlannerPageLoading() {
    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-40 bg-gray-200 animate-pulse rounded" />
                        <div className="h-5 w-96 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            <div className="w-full bg-white px-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="py-3 space-y-8">
                        {/* Weekly View Skeleton */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
                                    <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg" />
                                ))}
                            </div>
                        </div>

                        {/* Calendar Skeleton */}
                        <div className="h-[calc(100vh-300px)] bg-gray-100 animate-pulse rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}

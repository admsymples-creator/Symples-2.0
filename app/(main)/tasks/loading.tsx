export default function TasksPageLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
                        <div className="h-5 w-64 bg-gray-100 animate-pulse rounded" />
                    </div>
                    <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="max-w-[1600px] mx-auto flex items-center gap-4">
                    <div className="h-10 w-64 bg-gray-100 animate-pulse rounded" />
                    <div className="h-10 w-32 bg-gray-100 animate-pulse rounded" />
                    <div className="h-10 w-32 bg-gray-100 animate-pulse rounded" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="px-6 py-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-3" />
                                <div className="space-y-2">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="h-16 bg-gray-100 animate-pulse rounded" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}



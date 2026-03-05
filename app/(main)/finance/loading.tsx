export default function FinancePageLoading() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
                        <div className="h-5 w-64 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            {/* View Mode Skeleton */}
            <div className="border-b border-gray-200 bg-white px-6 py-3">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded" />
                        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded" />
                        <div className="h-9 w-24 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            {/* Actions & Filters Skeleton */}
            <div className="border-b border-gray-200 bg-white px-6">
                <div className="max-w-[1600px] mx-auto py-3">
                    <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-56 bg-gray-100 animate-pulse rounded" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-36 bg-gray-100 animate-pulse rounded" />
                            <div className="h-9 w-28 bg-gray-100 animate-pulse rounded" />
                            <div className="h-9 w-28 bg-gray-100 animate-pulse rounded" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="px-6 py-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="h-32 bg-white border border-gray-200 rounded-lg animate-pulse mb-6" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="h-64 bg-white border border-gray-200 rounded-lg animate-pulse" />
                            <div className="h-64 bg-white border border-gray-200 rounded-lg animate-pulse" />
                        </div>
                        <div className="h-64 bg-white border border-gray-200 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}



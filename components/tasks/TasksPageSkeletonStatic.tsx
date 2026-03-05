export function TasksPageSkeletonStatic() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
                        <div className="h-5 w-64 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200 bg-white px-6 py-3">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded" />
                        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded" />
                        <div className="h-9 w-24 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

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

            <div className="px-6 py-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="space-y-6">
                        {[1, 2, 3].map((group) => (
                            <div key={group} className="space-y-2">
                                <div className="flex items-center h-8 px-1 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                                    <div className="h-3 w-28 bg-gray-200 animate-pulse rounded" />
                                    <div className="h-5 w-6 bg-gray-100 animate-pulse rounded-full border border-gray-200" />
                                </div>
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-2 min-h-[300px]">
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5, 6].map((row) => (
                                            <div key={row} className="h-11 bg-white border border-gray-100 rounded animate-pulse" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

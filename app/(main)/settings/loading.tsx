export default function SettingsPageLoading() {
    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-7 w-72 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-96 bg-gray-100 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            <div className="w-full bg-white px-6">
                <div className="max-w-[1600px] mx-auto">
                    <div className="py-3 space-y-6">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="h-9 w-24 bg-gray-100 animate-pulse rounded" />
                            <div className="h-9 w-24 bg-gray-100 animate-pulse rounded" />
                            <div className="h-9 w-28 bg-gray-100 animate-pulse rounded" />
                            <div className="h-9 w-24 bg-gray-100 animate-pulse rounded" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-36 bg-gray-100 animate-pulse rounded-lg" />
                            <div className="h-36 bg-gray-100 animate-pulse rounded-lg" />
                            <div className="h-36 bg-gray-100 animate-pulse rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

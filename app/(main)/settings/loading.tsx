export default function SettingsPageLoading() {
    return (
        <div className="w-full bg-white">
            <div className="max-w-[1600px] mx-auto px-6">
                <div className="py-3 space-y-6">
                    <div className="space-y-2">
                        <div className="h-8 w-72 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-96 bg-gray-100 animate-pulse rounded" />
                    </div>
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
    );
}

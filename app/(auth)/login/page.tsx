import { Suspense } from "react";
import { LoginForm } from "@/components/landing/LoginForm";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full grid lg:grid-cols-2">
                <div className="hidden lg:flex bg-slate-900 flex-col items-center justify-center p-12 relative">
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="w-[200px] h-[60px] bg-slate-800 rounded animate-pulse" />
                    </div>
                </div>
                <div className="bg-white flex flex-col items-center justify-center p-8 lg:p-12">
                    <div className="w-full max-w-[400px] space-y-6">
                        <div className="flex lg:hidden items-center mb-8">
                            <div className="w-[150px] h-[45px] bg-slate-200 rounded animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-9 w-48 bg-slate-200 rounded animate-pulse" />
                            <div className="h-5 w-64 bg-slate-200 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}

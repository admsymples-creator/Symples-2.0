"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    User, 
    Settings, 
    LogOut, 
    Loader2 
} from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuGroup, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/lib/actions/auth";
import { toast } from "sonner"; // Assuming sonner is used, if not I'll use alert or simple text change

interface UserNavProps {
    user?: {
        name?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
    } | null;
}

export function UserNav({ user }: UserNavProps) {
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Prevenir erro de hidratação - montar apenas no cliente
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fallback data
    const name = user?.name || "Usuário";
    const email = user?.email || "usuario@symples.com";
    const avatarUrl = user?.avatarUrl;
    
    // Initials for fallback
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    const handleSignOut = async () => {
        setIsSigningOut(true);
        
        // Opcional: Feedback visual imediato
        // toast.loading("Saindo..."); 
        
        try {
            await signOut();
            // Redirection is handled by the server action, 
            // but we can also force a client-side redirect just in case
            // or simply wait.
        } catch (error) {
            console.error("Erro ao sair:", error);
            setIsSigningOut(false);
        }
    };

    // Renderizar apenas após montagem no cliente para evitar erro de hidratação
    if (!isMounted) {
        return (
            <div className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarUrl || undefined} alt={name} />
                    <AvatarFallback className="bg-green-100 text-green-700 font-medium">
                        {initials}
                    </AvatarFallback>
                </Avatar>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative h-9 w-9 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={avatarUrl || undefined} alt={name} />
                        <AvatarFallback className="bg-green-100 text-green-700 font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-gray-900">{name}</p>
                        <p className="text-xs leading-none text-gray-500 truncate">
                            {email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <Link href="/settings?tab=profile">
                        <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Perfil</span>
                        </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                        </DropdownMenuItem>
                    </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                >
                    {isSigningOut ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Saindo...</span>
                        </>
                    ) : (
                        <>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}





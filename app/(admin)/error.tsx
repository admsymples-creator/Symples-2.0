'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Acesso Negado</h2>
            <p className="text-gray-500 max-w-sm">
                Você não tem permissão para acessar o painel administrativo.
                Se acredita ser um erro, contate o desenvolvedor.
            </p>
            <div className="flex gap-2">
                <Button variant="outline" asChild>
                    <Link href="/home">Voltar para Home</Link>
                </Button>
            </div>
        </div>
    )
}

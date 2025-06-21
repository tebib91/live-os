import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      <h1 className="text-2xl font-bold">HomeOS Clone</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Go to Dashboard
      </Link>
    </main>
  )
}

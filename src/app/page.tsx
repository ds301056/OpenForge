import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">OpenForge</h1>
        <p className="text-xl text-muted-foreground max-w-lg">
          Turn vague goals into adaptive, explainable execution plans.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/goals"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

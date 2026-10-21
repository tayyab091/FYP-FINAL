export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="elite-panel flex flex-col items-center gap-5 px-10 py-8">
        <div className="relative flex size-12 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
          <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
        <div className="text-center">
          <p className="font-heading text-sm font-bold text-foreground">Preparing your experience</p>
          <p className="mt-1 text-xs text-muted-foreground">Train. Eat. Sleep. Thrive.</p>
        </div>
      </div>
    </div>
  )
}

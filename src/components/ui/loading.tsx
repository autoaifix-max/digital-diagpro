export function LoadingBlock({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div className="grid min-h-52 place-items-center text-sm text-[#a4aab5]">
      <div className="grid justify-items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-[#FFD100] border-t-transparent" />
        <span>{label}</span>
      </div>
    </div>
  );
}

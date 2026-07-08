export function NovaraLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#1e40af" />
      <path d="M8 10h4l4 6 4-6h4l-6 9v5h-4v-5L8 10z" fill="white" />
    </svg>
  );
}

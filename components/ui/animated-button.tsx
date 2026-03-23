import { cn } from "@/lib/utils";

interface AnimatedButtonProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedButton({ href = "#", children = "Get Started", className, onClick }: AnimatedButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-start px-6 py-2 overflow-hidden font-medium transition-all bg-white rounded hover:bg-white group outline outline-1 outline-white/20",
        className
      )}
    >
      <span className="w-48 h-48 rounded rotate-[-40deg] bg-white absolute bottom-0 left-0 -translate-x-full ease-out duration-500 transition-all translate-y-full mb-9 ml-9 group-hover:ml-0 group-hover:mb-32 group-hover:translate-x-0"></span>
      <span className="relative w-full text-left text-black transition-colors duration-300 ease-in-out group-hover:text-black">
        {children}
      </span>
    </a>
  );
}

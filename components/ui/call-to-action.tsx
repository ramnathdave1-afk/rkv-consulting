import { MoveRight, PhoneCall } from "lucide-react";
import { ShadcnButton as Button } from "@/components/ui/shadcn-button";

function CTA() {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto px-6">
        <div className="flex flex-col text-center bg-white/[0.03] border border-white/5 rounded-xl p-8 lg:p-14 gap-8 items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">Get started</span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-3xl md:text-5xl tracking-tighter max-w-xl font-bold text-white">
              Ready to automate your portfolio?
            </h3>
            <p className="text-base leading-relaxed tracking-tight text-neutral-400 max-w-xl">
              Stop drowning in manual processes. RKV Consulting gives your 5-person team the power of 20 — with AI that handles tenant communication, maintenance dispatch, and owner reporting automatically.
            </p>
          </div>
          <div className="flex flex-row gap-4">
            <Button className="gap-3 rounded-full border-white/10 text-white hover:bg-white/10" variant="outline">
              Jump on a call <PhoneCall className="w-4 h-4" />
            </Button>
            <Button className="gap-3 rounded-full bg-white text-black hover:bg-white/90">
              Get Started <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CTA };

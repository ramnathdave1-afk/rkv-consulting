"use client";

import { motion } from "framer-motion";
import { Building2, Home, Landmark, KeyRound, DoorOpen, LayoutGrid, Phone, CreditCard, Mail, Calendar, Calculator, Send } from "lucide-react";

const integrations = [
  { name: 'AppFolio', icon: Building2 },
  { name: 'Buildium', icon: Home },
  { name: 'Yardi', icon: Landmark },
  { name: 'Rent Manager', icon: KeyRound },
  { name: 'DoorLoop', icon: DoorOpen },
  { name: 'RealPage', icon: LayoutGrid },
  { name: 'Twilio', icon: Phone },
  { name: 'Stripe', icon: CreditCard },
  { name: 'Gmail', icon: Mail },
  { name: 'Google Cal', icon: Calendar },
  { name: 'QuickBooks', icon: Calculator },
  { name: 'Resend', icon: Send },
];

export function LogoCarousel() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-4">
      {integrations.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04, duration: 0.4 }}
          className="group flex flex-col items-center gap-2 py-3 cursor-default"
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-white/10 group-hover:-translate-y-1 transition-all duration-200">
            <item.icon className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
          <span className="text-[9px] text-white/20 group-hover:text-white/40 transition-colors font-medium text-center leading-tight">{item.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

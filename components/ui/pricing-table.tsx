"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, ArrowRight } from "lucide-react"
import NumberFlow from "@number-flow/react"

export type PlanLevel = "basic" | "pro" | "elite" | string

export interface PricingFeature {
  name: string
  included: PlanLevel | null
}

export interface PricingPlan {
  name: string
  level: PlanLevel
  price: {
    monthly: number
    yearly: number
  }
  popular?: boolean
}

export interface PricingTableProps
  extends React.HTMLAttributes<HTMLDivElement> {
  features: PricingFeature[]
  plans: PricingPlan[]
  onPlanSelect?: (plan: PlanLevel) => void
  defaultPlan?: PlanLevel
  defaultInterval?: "monthly" | "yearly"
  containerClassName?: string
  buttonClassName?: string
  isLoading?: boolean
  onCheckout?: (plan: PlanLevel, interval: "monthly" | "yearly") => void
}

export function PricingTable({
  features,
  plans,
  onPlanSelect,
  defaultPlan = "pro",
  defaultInterval = "monthly",
  className: _className,
  containerClassName,
  buttonClassName,
  isLoading,
  onCheckout,
  ...props
}: PricingTableProps) {
  const [isYearly, setIsYearly] = React.useState(defaultInterval === "yearly")
  const [selectedPlan, setSelectedPlan] = React.useState<PlanLevel>(defaultPlan)

  const handlePlanSelect = (plan: PlanLevel) => {
    setSelectedPlan(plan)
    onPlanSelect?.(plan)
  }

  return (
    <div
      className={cn("w-full max-w-3xl mx-auto", containerClassName)}
      {...props}
    >
      <div className="flex justify-end mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono">
          <button
            type="button"
            onClick={() => setIsYearly(false)}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              !isYearly ? "bg-[#1e1e1e] text-white" : "text-muted",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setIsYearly(true)}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              isYearly ? "bg-[#1e1e1e] text-white" : "text-muted",
            )}
          >
            Yearly
          </button>
          {isYearly && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {plans.map((plan) => (
          <button
            key={plan.name}
            type="button"
            onClick={() => handlePlanSelect(plan.level)}
            className={cn(
              "flex-1 p-4 rounded-xl text-left transition-all",
              "border bg-card",
              selectedPlan === plan.level
                ? "ring-2 ring-gold border-gold/50"
                : "border-border hover:border-border-hover",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-display font-medium text-white">{plan.name}</span>
              {plan.popular && (
                <span className="text-[10px] font-mono uppercase tracking-wider bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <NumberFlow
                format={{
                  style: "currency",
                  currency: "USD",
                  trailingZeroDisplay: "stripIfInteger",
                }}
                value={isYearly ? plan.price.yearly : plan.price.monthly}
                className="text-2xl font-bold font-mono text-white"
              />
              <span className="text-sm font-mono text-muted">
                /{isYearly ? "year" : "month"}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px] divide-y divide-border">
            <div className="flex items-center p-4 bg-card">
              <div className="flex-1 text-sm font-display font-medium text-white">Features</div>
              <div className="flex items-center gap-8 text-sm">
                {plans.map((plan) => (
                  <div
                    key={plan.level}
                    className={cn(
                      "w-16 text-center font-display font-medium",
                      selectedPlan === plan.level ? "text-gold" : "text-muted"
                    )}
                  >
                    {plan.name}
                  </div>
                ))}
              </div>
            </div>
            {features.map((feature) => (
              <div
                key={feature.name}
                className={cn(
                  "flex items-center p-4 transition-colors",
                  feature.included === selectedPlan &&
                    "bg-gold/5",
                )}
              >
                <div className="flex-1 text-sm font-mono text-white/80">{feature.name}</div>
                <div className="flex items-center gap-8 text-sm">
                  {plans.map((plan) => (
                    <div
                      key={plan.level}
                      className={cn(
                        "w-16 flex justify-center",
                        plan.level === selectedPlan && "font-medium",
                      )}
                    >
                      {shouldShowCheck(feature.included, plan.level) ? (
                        <Check className="w-5 h-5 text-green" />
                      ) : (
                        <span className="text-muted/40">
                          -
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => onCheckout?.(selectedPlan, isYearly ? "yearly" : "monthly")}
          disabled={isLoading}
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl",
            "bg-gold text-black font-display font-semibold text-sm tracking-wide",
            "hover:brightness-110 transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
            isLoading && "opacity-60 cursor-not-allowed",
            buttonClassName,
          )}
          style={{ boxShadow: '0 0 30px rgba(201,168,76,0.25)' }}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            <>
              Get started with {plans.find((p) => p.level === selectedPlan)?.name}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function shouldShowCheck(
  included: PricingFeature["included"],
  level: string,
): boolean {
  if (included === "elite") return level === "elite"
  if (included === "pro") return level === "pro" || level === "elite"
  if (included === "basic") return level === "basic" || level === "pro" || level === "elite"
  return false
}

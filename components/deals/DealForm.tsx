'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  MapPin,
  DollarSign,
  Percent,
  Home,
  TrendingUp,
  Wrench,
  BarChart3,
  Calculator,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DealFormData {
  propertyAddress: string;
  askingPrice: number;
  downPaymentPct: number;
  interestRate: number;
  loanTerm: number;
  propertyType: string;
  expectedMonthlyRent: number;
  vacancyRate: number;
  monthlyOperatingExpenses: number;
  rehabEstimate: number;
  afterRepairValue: number;
  annualAppreciation: number;
  annualRentGrowth: number;
}

export interface DealFormProps {
  onAnalyze: (data: DealFormData) => void;
  isLoading: boolean;
  usageCount: number;
  usageLimit: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LOAN_TERM_OPTIONS = [
  { value: '15', label: '15 Years' },
  { value: '20', label: '20 Years' },
  { value: '30', label: '30 Years' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'single-family', label: 'Single Family' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumberInput(value: string): string {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('en-US');
}

function parseFormattedNumber(value: string): number {
  return Number(value.replace(/[^0-9.]/g, '')) || 0;
}

/* ------------------------------------------------------------------ */
/*  Dollar prefix input wrapper                                        */
/* ------------------------------------------------------------------ */

function DollarInput({
  label,
  value,
  onChange,
  helperText,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (formatted: string) => void;
  helperText?: string;
  placeholder?: string;
}) {
  return (
    <Input
      label={label}
      value={value}
      onChange={(e) => onChange(formatNumberInput(e.target.value))}
      placeholder={placeholder || '0'}
      helperText={helperText}
      icon={<DollarSign className="w-4 h-4" />}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  DealForm                                                           */
/* ------------------------------------------------------------------ */

function DealForm({ onAnalyze, isLoading, usageCount, usageLimit }: DealFormProps) {
  /* -- Form state -------------------------------------------------- */
  const [propertyAddress, setPropertyAddress] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [interestRate, setInterestRate] = useState('7.0');
  const [loanTerm, setLoanTerm] = useState('30');
  const [propertyType, setPropertyType] = useState('single-family');
  const [expectedMonthlyRent, setExpectedMonthlyRent] = useState('');
  const [vacancyRate, setVacancyRate] = useState('5');
  const [monthlyOperatingExpenses, setMonthlyOperatingExpenses] = useState('');
  const [rehabEstimate, setRehabEstimate] = useState('');
  const [afterRepairValue, setAfterRepairValue] = useState('');
  const [annualAppreciation, setAnnualAppreciation] = useState('3.0');
  const [annualRentGrowth, setAnnualRentGrowth] = useState('2.0');

  const atLimit = usageCount >= usageLimit;
  const usagePct = usageLimit > 0 ? Math.min((usageCount / usageLimit) * 100, 100) : 0;

  /* -- Submit ------------------------------------------------------ */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (atLimit || isLoading) return;

      const data: DealFormData = {
        propertyAddress,
        askingPrice: parseFormattedNumber(askingPrice),
        downPaymentPct,
        interestRate: parseFloat(interestRate) || 7.0,
        loanTerm: parseInt(loanTerm, 10),
        propertyType,
        expectedMonthlyRent: parseFormattedNumber(expectedMonthlyRent),
        vacancyRate: parseFloat(vacancyRate) || 5,
        monthlyOperatingExpenses: parseFormattedNumber(monthlyOperatingExpenses),
        rehabEstimate: parseFormattedNumber(rehabEstimate),
        afterRepairValue: parseFormattedNumber(afterRepairValue),
        annualAppreciation: parseFloat(annualAppreciation) || 3.0,
        annualRentGrowth: parseFloat(annualRentGrowth) || 2.0,
      };

      onAnalyze(data);
    },
    [
      propertyAddress, askingPrice, downPaymentPct, interestRate, loanTerm,
      propertyType, expectedMonthlyRent, vacancyRate, monthlyOperatingExpenses,
      rehabEstimate, afterRepairValue, annualAppreciation, annualRentGrowth,
      onAnalyze, atLimit, isLoading,
    ],
  );

  /* -- Render ------------------------------------------------------ */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20">
          <Calculator className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-white">Analyze a Deal</h2>
          <p className="text-xs text-muted font-body">Enter property details below</p>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Property Info                                                */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        <p className="text-xs font-display font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
          <Home className="w-3.5 h-3.5" /> Property Info
        </p>

        <Input
          label="Property Address"
          value={propertyAddress}
          onChange={(e) => setPropertyAddress(e.target.value)}
          placeholder="123 Main St, Phoenix, AZ 85001"
          helperText="Google Maps autocomplete coming soon"
          icon={<MapPin className="w-4 h-4" />}
        />

        <div className="grid grid-cols-2 gap-3">
          <DollarInput
            label="Asking Price"
            value={askingPrice}
            onChange={setAskingPrice}
            placeholder="300,000"
          />
          <DollarInput
            label="After Repair Value"
            value={afterRepairValue}
            onChange={setAfterRepairValue}
            placeholder="350,000"
          />
        </div>

        <Select
          label="Property Type"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          options={PROPERTY_TYPE_OPTIONS}
        />

        <DollarInput
          label="Rehab Estimate"
          value={rehabEstimate}
          onChange={setRehabEstimate}
          placeholder="25,000"
        />
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Financing                                                    */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        <p className="text-xs font-display font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" /> Financing
        </p>

        {/* Down Payment Slider */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm text-muted font-body">Down Payment</label>
            <span className="text-sm font-body font-medium text-gold tabular-nums">{downPaymentPct}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className={cn(
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              'bg-deep border border-border',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black',
              '[&::-webkit-slider-thumb]:shadow-glow-sm [&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200',
              '[&::-webkit-slider-thumb]:hover:shadow-glow',
              '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5',
              '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gold',
              '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black',
              '[&::-moz-range-thumb]:cursor-pointer',
            )}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted font-body">5%</span>
            <span className="text-[10px] text-muted font-body">30%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Interest Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="20"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            helperText="Current rate: auto-filled from FRED API"
            icon={<Percent className="w-4 h-4" />}
          />
          <Select
            label="Loan Term"
            value={loanTerm}
            onChange={(e) => setLoanTerm(e.target.value)}
            options={LOAN_TERM_OPTIONS}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Income & Expenses                                            */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        <p className="text-xs font-display font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" /> Income & Expenses
        </p>

        <div className="grid grid-cols-2 gap-3">
          <DollarInput
            label="Expected Monthly Rent"
            value={expectedMonthlyRent}
            onChange={setExpectedMonthlyRent}
            placeholder="2,500"
          />
          <Input
            label="Vacancy Rate (%)"
            type="number"
            step="1"
            min="0"
            max="50"
            value={vacancyRate}
            onChange={(e) => setVacancyRate(e.target.value)}
            icon={<Percent className="w-4 h-4" />}
          />
        </div>

        <DollarInput
          label="Monthly Operating Expenses"
          value={monthlyOperatingExpenses}
          onChange={setMonthlyOperatingExpenses}
          placeholder="800"
        />
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Growth Assumptions                                           */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        <p className="text-xs font-display font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> Growth Assumptions
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Annual Appreciation (%)"
            type="number"
            step="0.1"
            min="0"
            max="20"
            value={annualAppreciation}
            onChange={(e) => setAnnualAppreciation(e.target.value)}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <Input
            label="Annual Rent Growth (%)"
            type="number"
            step="0.1"
            min="0"
            max="20"
            value={annualRentGrowth}
            onChange={(e) => setAnnualRentGrowth(e.target.value)}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Usage counter                                                */}
      {/* ------------------------------------------------------------ */}
      <div className="bg-deep rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-body">Monthly analyses</span>
          <span className="text-xs font-body font-medium tabular-nums text-white">
            {usageCount} of {usageLimit} used
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              usagePct >= 100 ? 'bg-red' : usagePct >= 80 ? 'bg-gold-light' : 'bg-gold',
            )}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Submit                                                       */}
      {/* ------------------------------------------------------------ */}
      {atLimit ? (
        <div className="text-center space-y-2">
          <p className="text-sm text-red font-body font-medium">Monthly limit reached</p>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => {
              /* TODO: open upgrade modal */
            }}
          >
            Upgrade for More Analyses
          </Button>
        </div>
      ) : (
        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          loading={isLoading}
          icon={!isLoading ? <Wrench className="w-4 h-4" /> : undefined}
        >
          {isLoading ? 'Analyzing...' : 'Analyze This Deal'}
        </Button>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

DealForm.displayName = 'DealForm';

export { DealForm };
export default DealForm;

'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import Link from 'next/link';
import { ArrowUpDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PIPELINE_STAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { PipelineStage } from '@/lib/types';

export interface SiteRow {
  id: string;
  name: string;
  state: string;
  county: string | null;
  target_mw: number | null;
  acreage: number | null;
  zoning: string | null;
  pipeline_stage: PipelineStage;
  composite_score: number | null;
  risk_score: number | null;
  distance_to_substation_mi: number | null;
}

function scoreColor(score: number | null): string {
  if (score === null) return '#4A5568';
  if (score >= 80) return '#00D4AA';
  if (score >= 60) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

const columns: ColumnDef<SiteRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="accent-accent h-3 w-3"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="accent-accent h-3 w-3"
      />
    ),
    size: 32,
    enableSorting: false,
  },
  {
    accessorKey: 'id',
    header: 'Site ID',
    cell: ({ row }) => (
      <span className="font-mono text-[10px] text-text-muted">{row.original.id.slice(0, 8)}</span>
    ),
    size: 80,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link href={`/sites/${row.original.id}`} className="text-text-primary hover:text-accent transition-colors font-medium">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'target_mw',
    header: 'MW',
    cell: ({ row }) => (
      <span className="font-mono">{row.original.target_mw ?? '—'}</span>
    ),
    size: 60,
  },
  {
    accessorKey: 'distance_to_substation_mi',
    header: 'Dist. (mi)',
    cell: ({ row }) => (
      <span className="font-mono">{row.original.distance_to_substation_mi?.toFixed(1) ?? '—'}</span>
    ),
    size: 70,
  },
  {
    accessorKey: 'zoning',
    header: 'Zoning',
    cell: ({ row }) => (
      <span className="text-text-secondary">{row.original.zoning ?? '—'}</span>
    ),
    size: 80,
  },
  {
    accessorKey: 'risk_score',
    header: 'Risk',
    cell: ({ row }) => {
      const v = row.original.risk_score;
      return v !== null ? (
        <span className="font-mono" style={{ color: scoreColor(v) }}>{v}</span>
      ) : <span className="text-text-muted">—</span>;
    },
    size: 50,
  },
  {
    accessorKey: 'composite_score',
    header: 'Score',
    cell: ({ row }) => {
      const v = row.original.composite_score;
      return v !== null ? (
        <span className="font-mono font-semibold" style={{ color: scoreColor(v) }}>{v}</span>
      ) : <span className="text-text-muted">—</span>;
    },
    size: 50,
  },
  {
    accessorKey: 'pipeline_stage',
    header: 'Stage',
    cell: ({ row }) => {
      const stage = PIPELINE_STAGES.find((s) => s.value === row.original.pipeline_stage);
      return stage ? <Badge color={stage.color} size="sm">{stage.label}</Badge> : null;
    },
    size: 100,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link
        href={`/sites/${row.original.id}`}
        className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover transition-colors"
      >
        <Eye size={11} />
        <span>Dossier</span>
      </Link>
    ),
    size: 60,
    enableSorting: false,
  },
];

interface SiteDataTableProps {
  data: SiteRow[];
  onSelectionChange?: (selected: SiteRow[]) => void;
}

export function SiteDataTable({ data, onSelectionChange }: SiteDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        const selectedRows = Object.keys(next).filter((k) => next[k]).map((k) => data[parseInt(k)]);
        onSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="glass-card overflow-hidden">
      {/* Filter row */}
      <div className="flex gap-2 p-2 border-b border-border">
        <input
          type="text"
          placeholder="Filter by name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
          className="rounded border border-border bg-bg-primary px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent w-36"
        />
        <input
          type="text"
          placeholder="Filter stage..."
          value={(table.getColumn('pipeline_stage')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('pipeline_stage')?.setFilterValue(e.target.value)}
          className="rounded border border-border bg-bg-primary px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent w-28"
        />
        <input
          type="text"
          placeholder="Filter zoning..."
          value={(table.getColumn('zoning')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('zoning')?.setFilterValue(e.target.value)}
          className="rounded border border-border bg-bg-primary px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent w-28"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'py-1.5 px-2 text-left text-[10px] uppercase tracking-wider text-text-muted font-medium',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-text-secondary',
                    )}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <ArrowUpDown size={9} className="opacity-40" />}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cn('border-b border-border/30 transition-colors', row.getIsSelected() ? 'bg-accent/5' : 'hover:bg-bg-elevated/20')}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-1.5 px-2 text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <span className="text-[10px] text-text-muted">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} selected
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

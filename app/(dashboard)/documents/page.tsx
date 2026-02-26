'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText,
  File,
  FileCheck,
  Upload,
  Search,
  Grid3X3,
  List,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  HardDrive,
  Clock,
  PenLine,
  X,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DocumentRow {
  id: string;
  user_id: string;
  property_id: string | null;
  tenant_id: string | null;
  deal_id: string | null;
  name: string;
  type: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  expires_at: string | null;
  extracted_data: Record<string, unknown> | null;
  tags: string[] | null;
  signed: boolean;
  docusign_envelope_id: string | null;
  created_at: string;
}

interface PropertyOption {
  id: string;
  address: string;
}

interface TenantOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface DealOption {
  id: string;
  name: string;
  address: string;
}

type FilterKey = 'all' | 'lease' | 'insurance' | 'tax' | 'inspection' | 'receipt' | 'other';
type ViewMode = 'grid' | 'table';
type SortKey = 'name' | 'type' | 'created_at' | 'file_size' | 'expires_at';
type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DOCUMENT_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lease', label: 'Leases' },
  { key: 'insurance', label: 'Financials' },
  { key: 'tax', label: 'Insurance' },
  { key: 'inspection', label: 'Tax' },
  { key: 'receipt', label: 'Inspections' },
  { key: 'other', label: 'Other' },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'lease', label: 'Lease' },
  { value: 'insurance', label: 'Insurance Policy' },
  { value: 'tax', label: 'Tax Document' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'contract', label: 'ID / Verification' },
  { value: 'report', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

const ACCEPT_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getFileIcon(mimeType: string | null, signed: boolean) {
  if (signed) return FileCheck;
  if (mimeType?.includes('pdf') || mimeType?.includes('word')) return FileText;
  return File;
}

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    lease: 'Lease',
    insurance: 'Insurance',
    tax: 'Tax',
    inspection: 'Inspection',
    receipt: 'Receipt',
    contract: 'Contract',
    report: 'Report',
    photo: 'Photo',
    other: 'Other',
  };
  return labels[type || ''] || type || 'Unknown';
}

function getTypeBadgeVariant(type: string | null): 'default' | 'success' | 'warning' | 'info' | 'danger' {
  switch (type) {
    case 'lease': return 'default';
    case 'insurance': return 'info';
    case 'tax': return 'warning';
    case 'inspection': return 'success';
    case 'receipt': return 'info';
    default: return 'info';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DocumentsPage() {
  const supabase = createClient();

  // Data state
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('lease');
  const [uploadProperty, setUploadProperty] = useState('');
  const [uploadTenant, setUploadTenant] = useState('');
  const [uploadDeal, setUploadDeal] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Fetch data ------------------------------------------------ */

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [docsRes, propsRes, tenantsRes, dealsRes] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('properties')
        .select('id, address')
        .eq('user_id', user.id)
        .order('address'),
      supabase
        .from('tenants')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .order('first_name'),
      supabase
        .from('deals')
        .select('id, name, address')
        .eq('user_id', user.id)
        .order('name'),
    ]);

    setDocuments((docsRes.data || []) as DocumentRow[]);
    setProperties((propsRes.data || []) as PropertyOption[]);
    setTenants((tenantsRes.data || []) as TenantOption[]);
    setDeals((dealsRes.data || []) as DealOption[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Dropzone -------------------------------------------------- */

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadFile(file);
      setUploadName(file.name.replace(/\.[^/.]+$/, ''));
      if (!uploadOpen) setUploadOpen(true);
    }
  }, [uploadOpen]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_TYPES,
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024, // 25 MB
    noClick: false,
  });

  /* ---- Upload handler -------------------------------------------- */

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert document record (file upload requires Supabase Storage bucket)
      const tags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.from('documents').insert({
        user_id: user.id,
        name: uploadName || uploadFile.name,
        type: uploadType,
        file_url: null, // Requires Supabase Storage bucket configuration
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        property_id: uploadProperty || null,
        tenant_id: uploadTenant || null,
        deal_id: uploadDeal || null,
        expires_at: uploadExpiry || null,
        tags: tags.length > 0 ? tags : [],
        signed: false,
      });

      if (error) throw error;

      toast.success('Document uploaded successfully');
      resetUploadForm();
      setUploadOpen(false);
      fetchData();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  function resetUploadForm() {
    setUploadFile(null);
    setUploadName('');
    setUploadType('lease');
    setUploadProperty('');
    setUploadTenant('');
    setUploadDeal('');
    setUploadExpiry('');
    setUploadTags('');
  }

  /* ---- Delete handler -------------------------------------------- */

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const { error } = await supabase.from('documents').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Document deleted');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  }

  /* ---- Filtered + sorted documents ------------------------------ */

  const filtered = useMemo(() => {
    let result = [...documents];

    // Filter by type
    if (activeFilter !== 'all') {
      result = result.filter((d) => d.type === activeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.type && d.type.toLowerCase().includes(q)) ||
          (d.tags && d.tags.some((t) => t.toLowerCase().includes(q))),
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'type':
          cmp = (a.type || '').localeCompare(b.type || '');
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'file_size':
          cmp = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'expires_at':
          cmp =
            (a.expires_at ? new Date(a.expires_at).getTime() : Infinity) -
            (b.expires_at ? new Date(b.expires_at).getTime() : Infinity);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [documents, activeFilter, searchQuery, sortKey, sortDir]);

  /* ---- Computed stats ------------------------------------------- */

  const totalDocs = documents.length;

  const expiringSoon = documents.filter((d) => {
    const days = getDaysUntilExpiry(d.expires_at);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  const unsigned = documents.filter((d) => !d.signed).length;

  const totalStorage = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);

  /* ---- Sort handler --------------------------------------------- */

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  /* ---- Property / tenant name lookups --------------------------- */

  function getPropertyName(id: string | null): string {
    if (!id) return '--';
    return properties.find((p) => p.id === id)?.address || '--';
  }

  function getTenantName(id: string | null): string {
    if (!id) return '--';
    const t = tenants.find((t) => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : '--';
  }

  /* ---- Loading skeleton ----------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-border/50 rounded animate-pulse" />
          <div className="h-10 w-40 bg-border/50 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-8 w-20 bg-border/50 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" height="90px" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} variant="card" height="200px" />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Main render ---------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display font-bold text-2xl text-white">Document Vault</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full h-10 pl-10 pr-4 text-sm font-body',
                'bg-deep border border-border rounded-lg text-white',
                'placeholder:text-muted/60',
                'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40',
                'transition-all duration-200',
              )}
            />
          </div>

          {/* Upload button */}
          <Button
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  FILTER BAR                                                   */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {DOCUMENT_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium font-body',
                'transition-all duration-200 ease-out',
                activeFilter === f.key
                  ? 'bg-gold text-black'
                  : 'bg-card border border-border text-muted hover:text-white hover:border-gold/30',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-gold/15 text-gold'
                : 'text-muted hover:text-white',
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-gold/15 text-gold'
                : 'text-muted hover:text-white',
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  STATS ROW                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <FileText className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Total Documents</p>
            <p className="text-xl font-bold text-white">{totalDocs}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Clock className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Expiring Soon</p>
            <p className="text-xl font-bold text-white">{expiringSoon}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10 shrink-0">
            <PenLine className="h-5 w-5 text-red" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Unsigned</p>
            <p className="text-xl font-bold text-white">{unsigned}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 shrink-0">
            <HardDrive className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Storage Used</p>
            <p className="text-xl font-bold text-white">{formatFileSize(totalStorage)}</p>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  EMPTY STATE                                                  */}
      {/* ============================================================ */}
      {filtered.length === 0 && !searchQuery && activeFilter === 'all' ? (
        <EmptyState
          icon={<FileText />}
          title="No documents yet"
          description="Upload your first document to get started"
          action={{
            label: 'Upload Document',
            onClick: () => setUploadOpen(true),
            icon: <Upload />,
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted text-sm font-body">
            No documents match your search or filter.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ============================================================ */
        /*  DOCUMENT GRID                                                */
        /* ============================================================ */
        <div className="grid grid-cols-4 gap-4">
          {filtered.map((doc) => {
            const Icon = getFileIcon(doc.mime_type, doc.signed);
            const daysToExpiry = getDaysUntilExpiry(doc.expires_at);
            const propertyName = getPropertyName(doc.property_id);
            const tenantName = getTenantName(doc.tenant_id);

            return (
              <div
                key={doc.id}
                className={cn(
                  'group relative bg-card border border-border rounded-xl p-4',
                  'hover:border-gold/20 hover:shadow-glow-sm',
                  'transition-all duration-200',
                )}
              >
                {/* File icon + type */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <Badge variant={getTypeBadgeVariant(doc.type)} size="sm">
                    {getTypeLabel(doc.type)}
                  </Badge>
                </div>

                {/* Name */}
                <h3 className="text-sm font-semibold text-white truncate mb-1">
                  {doc.name}
                </h3>

                {/* Linked property / tenant */}
                {(doc.property_id || doc.tenant_id) && (
                  <p className="text-xs text-muted truncate mb-2">
                    {doc.property_id && propertyName !== '--'
                      ? propertyName
                      : doc.tenant_id && tenantName !== '--'
                        ? tenantName
                        : ''}
                  </p>
                )}

                {/* Date + size row */}
                <div className="flex items-center justify-between text-xs text-muted mt-2">
                  <span>{formatDate(doc.created_at)}</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>

                {/* Expiry warning */}
                {daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry >= 0 && (
                  <div
                    className={cn(
                      'flex items-center gap-1.5 mt-2 text-xs font-medium',
                      daysToExpiry <= 7 ? 'text-red' : 'text-gold',
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {daysToExpiry === 0
                      ? 'Expires today'
                      : `Expires in ${daysToExpiry} day${daysToExpiry !== 1 ? 's' : ''}`}
                  </div>
                )}
                {daysToExpiry !== null && daysToExpiry < 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red">
                    <AlertTriangle className="h-3 w-3" />
                    Expired {Math.abs(daysToExpiry)} day{Math.abs(daysToExpiry) !== 1 ? 's' : ''} ago
                  </div>
                )}

                {/* Hover actions */}
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 flex items-center justify-center gap-2',
                    'px-4 py-3 rounded-b-xl',
                    'bg-gradient-to-t from-card via-card/95 to-transparent',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  )}
                >
                  <button
                    onClick={() => {
                      if (doc.file_url) window.open(doc.file_url, '_blank');
                      else toast.info('File storage requires Supabase Storage bucket configuration');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      if (doc.file_url) {
                        const a = document.createElement('a');
                        a.href = doc.file_url;
                        a.download = doc.name;
                        a.click();
                      } else {
                        toast.info('File storage requires Supabase Storage bucket configuration');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => setDeleteId(doc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-red hover:bg-red/5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================================ */
        /*  TABLE VIEW                                                   */
        /* ============================================================ */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'name' as SortKey, label: 'Name' },
                    { key: 'type' as SortKey, label: 'Type' },
                    { key: 'created_at' as SortKey, label: 'Property' },
                    { key: 'created_at' as SortKey, label: 'Uploaded' },
                    { key: 'file_size' as SortKey, label: 'Size' },
                    { key: 'expires_at' as SortKey, label: 'Expires' },
                  ].map((col) => (
                    <th
                      key={col.label}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider',
                        'cursor-pointer hover:text-white transition-colors select-none',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key && (
                          <ChevronDown
                            className={cn(
                              'h-3 w-3 transition-transform',
                              sortDir === 'asc' && 'rotate-180',
                            )}
                          />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((doc) => {
                  const Icon = getFileIcon(doc.mime_type, doc.signed);
                  const daysToExpiry = getDaysUntilExpiry(doc.expires_at);

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-gold shrink-0" />
                          <span className="text-sm text-white truncate max-w-[200px]">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getTypeBadgeVariant(doc.type)} size="sm">
                          {getTypeLabel(doc.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted truncate max-w-[150px] block">
                          {getPropertyName(doc.property_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted">{formatDate(doc.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted">{formatFileSize(doc.file_size)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {doc.expires_at ? (
                          <span
                            className={cn(
                              'text-sm',
                              daysToExpiry !== null && daysToExpiry <= 7
                                ? 'text-red font-medium'
                                : daysToExpiry !== null && daysToExpiry <= 30
                                  ? 'text-gold font-medium'
                                  : 'text-muted',
                            )}
                          >
                            {formatDate(doc.expires_at)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (doc.file_url) window.open(doc.file_url, '_blank');
                              else toast.info('File storage requires Supabase Storage bucket configuration');
                            }}
                            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (doc.file_url) {
                                const a = document.createElement('a');
                                a.href = doc.file_url;
                                a.download = doc.name;
                                a.click();
                              } else {
                                toast.info('File storage requires Supabase Storage bucket configuration');
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(doc.id)}
                            className="p-1.5 rounded-lg text-muted hover:text-red hover:bg-red/5 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  UPLOAD MODAL                                                  */}
      {/* ============================================================ */}
      <Modal open={uploadOpen} onOpenChange={setUploadOpen}>
        <ModalContent maxWidth="lg">
          <ModalHeader
            title="Upload Document"
            description="Add a document to your vault"
          />

          <div className="px-6 pb-2 space-y-4">
            {/* Dropzone */}
            {!uploadFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'flex flex-col items-center justify-center gap-3',
                  'border-2 border-dashed rounded-xl p-8 cursor-pointer',
                  'transition-colors duration-200',
                  isDragActive
                    ? 'border-gold bg-gold/5'
                    : 'border-border hover:border-gold/40 hover:bg-white/[0.02]',
                )}
              >
                <input {...getInputProps()} />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                  <Upload className="h-5 w-5 text-gold" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">
                    Drop files here or click to browse
                  </p>
                  <p className="text-xs text-muted mt-1">
                    PDF, DOC, DOCX, PNG, JPG (max 25 MB)
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* File preview */}
                <div className="flex items-center gap-3 bg-deep border border-border rounded-lg p-3">
                  <FileText className="h-5 w-5 text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{uploadFile.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(uploadFile.size)}</p>
                  </div>
                  <button
                    onClick={() => setUploadFile(null)}
                    className="p-1 rounded text-muted hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form fields */}
                <Input
                  label="Document Name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g., Lease Agreement - 123 Main St"
                />

                <Select
                  label="Document Type"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  options={DOCUMENT_TYPE_OPTIONS}
                />

                <Select
                  label="Link to Property (optional)"
                  value={uploadProperty}
                  onChange={(e) => setUploadProperty(e.target.value)}
                  options={[
                    { value: '', label: 'None' },
                    ...properties.map((p) => ({ value: p.id, label: p.address })),
                  ]}
                />

                <Select
                  label="Link to Tenant (optional)"
                  value={uploadTenant}
                  onChange={(e) => setUploadTenant(e.target.value)}
                  options={[
                    { value: '', label: 'None' },
                    ...tenants.map((t) => ({
                      value: t.id,
                      label: `${t.first_name} ${t.last_name}`,
                    })),
                  ]}
                />

                <Select
                  label="Link to Deal (optional)"
                  value={uploadDeal}
                  onChange={(e) => setUploadDeal(e.target.value)}
                  options={[
                    { value: '', label: 'None' },
                    ...deals.map((d) => ({
                      value: d.id,
                      label: d.name || d.address,
                    })),
                  ]}
                />

                <Input
                  label="Expiration Date (optional)"
                  type="date"
                  value={uploadExpiry}
                  onChange={(e) => setUploadExpiry(e.target.value)}
                />

                <Input
                  label="Tags (comma-separated)"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g., signed, 2024, renewal"
                />

                <p className="text-xs text-muted/70 italic">
                  Note: File storage requires Supabase Storage bucket configuration
                </p>
              </>
            )}
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => {
                resetUploadForm();
                setUploadOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!uploadFile}
            >
              Upload
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ============================================================ */}
      {/*  DELETE CONFIRMATION MODAL                                     */}
      {/* ============================================================ */}
      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <ModalContent maxWidth="sm">
          <ModalHeader
            title="Delete Document"
            description="Are you sure you want to delete this document? This action cannot be undone."
          />
          <ModalFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

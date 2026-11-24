
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  UploadCloud,
  Files,
  Search,
  Workflow,
  ChartNoAxesCombined,
  Activity,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  Server,
  Database,
  LockKeyhole,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Play,
  WandSparkles,
  Filter,
  X,
  Clock,
} from "lucide-react";
import api from "./api";

// --------------------------------------------------
// NAVIGATION
// --------------------------------------------------

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Log Ingestion", icon: UploadCloud },
  { name: "File Management", icon: Files },
  { name: "Integrity Monitor", icon: ShieldCheck },
  { name: "Log Explorer", icon: Search },
  { name: "Normalization", icon: Workflow },
  { name: "Data Quality", icon: ChartNoAxesCombined },
  { name: "System Health", icon: Activity },
];

const initialMetrics = [
  {
    title: "Total Files",
    value: "—",
    description: "Loading files...",
    icon: Files,
    color: "text-cyan-400",
    background: "bg-cyan-400/10",
  },
  {
    title: "Parsed Events",
    value: "—",
    description: "Loading records...",
    icon: Workflow,
    color: "text-violet-400",
    background: "bg-violet-400/10",
  },
  {
    title: "Verified Files",
    value: "—",
    description: "Checking integrity...",
    icon: FileCheck,
    color: "text-emerald-400",
    background: "bg-emerald-400/10",
  },
  {
    title: "Quality Issues",
    value: "—",
    description: "Checking quality...",
    icon: AlertTriangle,
    color: "text-amber-400",
    background: "bg-amber-400/10",
  },
];

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function formatSize(bytes) {
  if (bytes === undefined || bytes === null) return "Unknown";
  if (bytes < 1024) return `${bytes} Bytes`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function statusStyle(status) {
  const value = (status || "").toLowerCase();

  if (["parsed", "normalized", "received"].includes(value)) {
    return "bg-emerald-400/10 text-emerald-400";
  }

  if (value === "partially_parsed") {
    return "bg-amber-400/10 text-amber-400";
  }

  if (value.includes("failed")) {
    return "bg-red-400/10 text-red-400";
  }

  return "bg-cyan-400/10 text-cyan-300";
}

// --------------------------------------------------
// LOG INGESTION PAGE
// --------------------------------------------------

function LogIngestionPage({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState("auto");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a log file first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("source_type", sourceType);

    try {
      const response = await api.post(
        "/api/ingest/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage(response.data);

      if (!response.data.duplicate && onUploadSuccess) {
        await onUploadSuccess();
      }

      setSelectedFile(null);

      const fileInput = document.getElementById("ulpf-file-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Upload failed. Please check the backend connection and try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-7 p-5 md:p-8">
      <section>
        <p className="text-sm text-cyan-400">DATA INGESTION</p>
        <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
          Log Ingestion
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Upload security log files into the Universal Log
          Pre-processing Framework.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6 xl:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <UploadCloud className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">
                Upload Security Logs
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Supported formats: JSON, CSV, XML, LOG and TXT
              </p>
            </div>
          </div>

          <label
            htmlFor="ulpf-file-input"
            className="mt-7 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-[#0c1422] p-6 text-center transition hover:border-cyan-400/60 hover:bg-cyan-400/5"
          >
            <div className="rounded-full bg-cyan-400/10 p-4">
              <UploadCloud className="h-8 w-8 text-cyan-400" />
            </div>

            <p className="mt-4 font-medium text-white">
              {selectedFile ? selectedFile.name : "Choose a log file"}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(2)} KB selected`
                : "Click here to browse files from your computer"}
            </p>

            <input
              id="ulpf-file-input"
              type="file"
              accept=".json,.csv,.xml,.log,.syslog,.txt"
              className="hidden"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setMessage(null);
                setError("");
              }}
            />
          </label>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Data Source Type
            </label>

            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="auto">Auto Detect</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
              <option value="syslog">Syslog</option>
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Auto Detect identifies the format using the file extension.
            </p>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-[#07111e] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                Upload Log File
              </>
            )}
          </button>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              <XCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">
                  {message.duplicate
                    ? "Duplicate File Detected"
                    : "File Uploaded Successfully"}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <p>
                  <span className="text-slate-500">Filename: </span>
                  {message.original_filename}
                </p>
                <p>
                  <span className="text-slate-500">File ID: </span>
                  {message.file_id ?? message.existing_file_id}
                </p>
                {message.source_type && (
                  <p>
                    <span className="text-slate-500">Format: </span>
                    {message.source_type.toUpperCase()}
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Status: </span>
                  {message.status}
                </p>
                <div>
                  <p className="mb-1 text-slate-500">SHA-256 Hash:</p>
                  <p className="break-all rounded-lg bg-[#0c1422] p-3 font-mono text-cyan-300">
                    {message.sha256_hash}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Upload Security</h3>
            </div>

            <div className="mt-6 space-y-5">
              {[
                "SHA-256 integrity hashing",
                "Duplicate file detection",
                "Original file preservation",
                "File type validation",
                "5 MB maximum upload size",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-violet-400" />
              <h3 className="font-semibold text-white">
                Processing Pipeline
              </h3>
            </div>

            <div className="mt-5 space-y-4">
              {[
                "File Ingestion",
                "Integrity Verification",
                "Log Parsing",
                "Normalization",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-semibold text-cyan-400">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-300">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------
// FILE MANAGEMENT PAGE — DAY 11
// --------------------------------------------------

function FileManagementPage({ files, onRefresh, loading }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFile, setSelectedFile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [details, setDetails] = useState(null);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = (
        file.original_filename || ""
      ).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFormat =
        formatFilter === "all" ||
        (file.source_type || "").toLowerCase() === formatFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (file.status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesFormat && matchesStatus;
    });
  }, [files, searchTerm, formatFilter, statusFilter]);

  const openDetails = async (file) => {
    setSelectedFile(file);
    setVerification(null);
    setDetails(null);
    setActionMessage("");
    setActionError("");

    try {
      const [recordsResponse, normalizedResponse] =
        await Promise.allSettled([
          api.get(`/api/ingest/files/${file.file_id}/records`),
          api.get(`/api/ingest/files/${file.file_id}/normalized`),
        ]);

      setDetails({
        records:
          recordsResponse.status === "fulfilled"
            ? recordsResponse.value.data.records || []
            : [],
        normalized:
          normalizedResponse.status === "fulfilled"
            ? normalizedResponse.value.data.events || []
            : [],
      });
    } catch {
      setDetails({ records: [], normalized: [] });
    }
  };

  const verifyFile = async (file) => {
    setActionLoading(`verify-${file.file_id}`);
    setActionMessage("");
    setActionError("");
    setVerification(null);

    try {
      const response = await api.get(
        `/api/ingest/files/${file.file_id}/verify`
      );

      setVerification(response.data);

      if (selectedFile?.file_id === file.file_id) {
        setVerification(response.data);
      }
    } catch (err) {
      setActionError(
        err.response?.data?.detail || "Integrity verification failed."
      );
    } finally {
      setActionLoading("");
    }
  };

  const processFile = async (file, action) => {
    setActionLoading(`${action}-${file.file_id}`);
    setActionMessage("");
    setActionError("");

    try {
      const response = await api.post(
        `/api/ingest/files/${file.file_id}/${action}`
      );

      setActionMessage(
        action === "parse"
          ? `Parsing completed. ${response.data.parsed_count ?? 0} records parsed and ${response.data.failed_count ?? 0} failed.`
          : `Normalization completed. ${response.data.normalized_count ?? 0} records normalized.`
      );

      await onRefresh();

      const updatedFile = files.find(
        (item) => item.file_id === file.file_id
      );

      if (updatedFile) {
        await openDetails({
          ...updatedFile,
          status: action === "parse" ? response.data.status : "normalized",
        });
      }
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          `${action === "parse" ? "Parsing" : "Normalization"} failed.`
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-7 p-5 md:p-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-400">FILE OPERATIONS</p>
          <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            File Management
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Search, inspect, verify and process your ingested security log files.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111b2b] px-4 py-3 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Files
        </button>
      </section>

      {/* FILE SUMMARY */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <p className="text-sm text-slate-400">Total Files</p>
          <h2 className="mt-3 text-3xl font-bold text-white">{files.length}</h2>
          <Files className="mt-2 h-5 w-5 text-cyan-400" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <p className="text-sm text-slate-400">Filtered Results</p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            {filteredFiles.length}
          </h2>
          <Filter className="mt-2 h-5 w-5 text-violet-400" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <p className="text-sm text-slate-400">Successfully Parsed</p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            {files.filter((file) =>
              ["parsed", "normalized", "partially_parsed"].includes(
                (file.status || "").toLowerCase()
              )
            ).length}
          </h2>
          <CheckCircle2 className="mt-2 h-5 w-5 text-emerald-400" />
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Search and Filter Files</h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search filename..."
              className="w-full rounded-xl border border-slate-700 bg-[#0c1422] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={formatFilter}
            onChange={(event) => setFormatFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">All Formats</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="xml">XML</option>
            <option value="syslog">Syslog</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">All Statuses</option>
            <option value="received">Received</option>
            <option value="parsed">Parsed</option>
            <option value="partially_parsed">Partially Parsed</option>
            <option value="parse_failed">Parse Failed</option>
            <option value="normalized">Normalized</option>
          </select>
        </div>

        {(searchTerm || formatFilter !== "all" || statusFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setFormatFilter("all");
              setStatusFilter("all");
            }}
            className="mt-4 flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </section>

      {/* FILE TABLE */}
      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Uploaded Files</h2>
            <p className="mt-1 text-xs text-slate-500">
              File records retrieved from the ULPF database.
            </p>
          </div>
          <Files className="h-5 w-5 text-cyan-400" />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
            Loading files...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-12 text-center">
            <Files className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3 font-medium text-slate-300">
              No files found
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Try changing your search or filters, or upload a new file.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-4">File ID</th>
                  <th className="px-3 py-4">Filename</th>
                  <th className="px-3 py-4">Format</th>
                  <th className="px-3 py-4">Size</th>
                  <th className="px-3 py-4">Status</th>
                  <th className="px-3 py-4">Received</th>
                  <th className="px-3 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredFiles.map((file) => (
                  <tr
                    key={file.file_id}
                    className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-4 text-slate-400">
                      #{file.file_id}
                    </td>
                    <td className="px-3 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
                        {file.original_filename}
                      </div>
                    </td>
                    <td className="px-3 py-4 uppercase text-slate-400">
                      {file.source_type}
                    </td>
                    <td className="px-3 py-4 text-slate-400">
                      {formatSize(file.size_bytes)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${statusStyle(file.status)}`}
                      >
                        {file.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500">
                      {formatDate(file.received_at)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetails(file)}
                          title="View file details"
                          className="rounded-lg border border-slate-700 p-2 text-cyan-400 hover:bg-cyan-400/10"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => verifyFile(file)}
                          disabled={actionLoading === `verify-${file.file_id}`}
                          title="Verify integrity"
                          className="rounded-lg border border-slate-700 p-2 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50"
                        >
                          {actionLoading === `verify-${file.file_id}` ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ACTION FEEDBACK */}
      {actionMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{actionMessage}</p>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <XCircle className="h-5 w-5 shrink-0" />
          <p>{actionError}</p>
        </div>
      )}

      {/* INTEGRITY RESULT */}
      {verification && (
        <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <div className="flex items-center gap-3">
            {verification.integrity_verified ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-400" />
            )}
            <div>
              <h3 className="font-semibold text-white">
                Integrity Verification Result
              </h3>
              <p
                className={`mt-1 text-sm ${
                  verification.integrity_verified
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {verification.integrity_verified
                  ? "File integrity verified. SHA-256 hashes match."
                  : "Integrity check failed. SHA-256 hashes do not match."}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-xs">
            <div>
              <p className="mb-1 text-slate-500">Stored SHA-256</p>
              <p className="break-all rounded-lg bg-[#0c1422] p-3 font-mono text-slate-300">
                {verification.stored_hash}
              </p>
            </div>
            <div>
              <p className="mb-1 text-slate-500">Current SHA-256</p>
              <p className="break-all rounded-lg bg-[#0c1422] p-3 font-mono text-slate-300">
                {verification.current_hash}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FILE DETAILS */}
      {selectedFile && (
        <section className="rounded-2xl border border-cyan-400/20 bg-[#111b2b] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-cyan-400">
                FILE INFORMATION
              </p>
              <h2 className="mt-2 text-lg font-bold text-white">
                {selectedFile.original_filename}
              </h2>
            </div>

            <button
              onClick={() => {
                setSelectedFile(null);
                setDetails(null);
                setVerification(null);
              }}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
              title="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["File ID", `#${selectedFile.file_id}`],
              ["Format", (selectedFile.source_type || "").toUpperCase()],
              ["File Size", formatSize(selectedFile.size_bytes)],
              ["Status", selectedFile.status],
              ["Received", formatDate(selectedFile.received_at)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-[#0c1422] p-4"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 break-words text-sm font-medium text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs text-slate-500">SHA-256 Hash</p>
            <p className="break-all rounded-xl bg-[#0c1422] p-4 font-mono text-xs text-cyan-300">
              {selectedFile.sha256_hash}
            </p>
          </div>

          {/* PROCESSING BUTTONS */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => verifyFile(selectedFile)}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify Integrity
            </button>

            <button
              onClick={() => processFile(selectedFile, "parse")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {actionLoading === `parse-${selectedFile.file_id}` ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Parse File
            </button>

            <button
              onClick={() => processFile(selectedFile, "normalize")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-400 hover:bg-violet-500/20 disabled:opacity-50"
            >
              {actionLoading === `normalize-${selectedFile.file_id}` ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4" />
              )}
              Normalize File
            </button>
          </div>

          {/* RECORD COUNTS */}
          {details && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-[#0c1422] p-4">
                <p className="text-xs text-slate-500">Parsed Records</p>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {details.records.filter(
                    (record) => record.status === "parsed"
                  ).length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0c1422] p-4">
                <p className="text-xs text-slate-500">Normalized Records</p>
                <p className="mt-2 text-2xl font-bold text-violet-400">
                  {details.normalized.length}
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// --------------------------------------------------
// INTEGRITY MONITOR PAGE — DAY 11
// --------------------------------------------------

function IntegrityMonitorPage({ files, onRefresh, loading }) {
  const [results, setResults] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);

  const verifyOne = async (file) => {
    setCheckingId(file.file_id);
    setError("");

    try {
      const response = await api.get(
        `/api/ingest/files/${file.file_id}/verify`
      );
      setResults((previous) => ({
        ...previous,
        [file.file_id]: response.data,
      }));
      setLastChecked(new Date());
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        `Could not verify file #${file.file_id}.`;
      setError(message);
      setResults((previous) => ({
        ...previous,
        [file.file_id]: {
          file_id: file.file_id,
          integrity_verified: false,
          verification_error: message,
        },
      }));
      return null;
    } finally {
      setCheckingId(null);
    }
  };

  const verifyAll = async () => {
    setCheckingAll(true);
    setError("");

    for (const file of files) {
      try {
        const response = await api.get(
          `/api/ingest/files/${file.file_id}/verify`
        );
        setResults((previous) => ({
          ...previous,
          [file.file_id]: response.data,
        }));
      } catch (err) {
        const message =
          err.response?.data?.detail ||
          `Could not verify file #${file.file_id}.`;
        setResults((previous) => ({
          ...previous,
          [file.file_id]: {
            file_id: file.file_id,
            integrity_verified: false,
            verification_error: message,
          },
        }));
      }
    }

    setLastChecked(new Date());
    setCheckingAll(false);
  };

  const verifiedCount = Object.values(results).filter(
    (item) => item.integrity_verified === true
  ).length;

  const failedCount = Object.values(results).filter(
    (item) =>
      item.integrity_verified === false ||
      Boolean(item.verification_error)
  ).length;

  const checkedCount = verifiedCount + failedCount;
  const uncheckedCount = Math.max(files.length - checkedCount, 0);

  return (
    <div className="space-y-7 p-5 md:p-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-400">ULPF SECURITY</p>
          <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            Integrity Monitor
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Verify stored security log files using SHA-256 hash comparison.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRefresh}
            disabled={loading || checkingAll}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111b2b] px-4 py-3 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Files
          </button>
          <button
            onClick={verifyAll}
            disabled={files.length === 0 || checkingAll || checkingId !== null}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#07111e] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldCheck className="h-4 w-4" />
            {checkingAll ? "Verifying All..." : "Verify All Files"}
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <XCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Files",
            value: files.length,
            icon: Files,
            color: "text-cyan-400",
          },
          {
            label: "Verified",
            value: verifiedCount,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Failed",
            value: failedCount,
            icon: AlertTriangle,
            color: "text-red-400",
          },
          {
            label: "Not Checked",
            value: uncheckedCount,
            icon: Clock,
            color: "text-amber-400",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <Icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {loading ? "..." : metric.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">File Integrity Status</h2>
            <p className="mt-1 text-xs text-slate-500">
              Each check compares the stored SHA-256 hash with the current file hash.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {lastChecked
              ? `Last checked: ${lastChecked.toLocaleTimeString()}`
              : "No verification run in this session"}
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center">
            <Files className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3 font-medium text-slate-300">No files available</p>
            <p className="mt-2 text-xs text-slate-500">
              Upload a security log file before running integrity verification.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-4">File ID</th>
                  <th className="px-3 py-4">Filename</th>
                  <th className="px-3 py-4">SHA-256 Status</th>
                  <th className="px-3 py-4">Verification</th>
                  <th className="px-3 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const result = results[file.file_id];
                  const isChecking =
                    checkingId === file.file_id || checkingAll;

                  return (
                    <tr
                      key={file.file_id}
                      className="border-b border-slate-800/70 hover:bg-slate-800/30"
                    >
                      <td className="px-3 py-4 text-slate-400">
                        #{file.file_id}
                      </td>
                      <td className="px-3 py-4 font-medium text-slate-200">
                        {file.original_filename}
                      </td>
                      <td className="px-3 py-4">
                        {result?.integrity_verified === true ? (
                          <span className="inline-flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Hashes Match
                          </span>
                        ) : result?.integrity_verified === false ? (
                          <span className="inline-flex items-center gap-2 text-red-400">
                            <AlertTriangle className="h-4 w-4" />
                            Verification Failed
                          </span>
                        ) : (
                          <span className="text-slate-500">Not checked</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-400">
                        {result?.verification_error ||
                          (result
                            ? "SHA-256 comparison completed"
                            : "Awaiting verification")}
                      </td>
                      <td className="px-3 py-4">
                        <button
                          onClick={() => verifyOne(file)}
                          disabled={isChecking}
                          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {checkingId === file.file_id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          Verify
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {Object.values(results).some((item) => item?.stored_hash || item?.current_hash) && (
        <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <h2 className="font-semibold text-white">Latest SHA-256 Comparison</h2>
          {files
            .filter((file) => results[file.file_id]?.stored_hash || results[file.file_id]?.current_hash)
            .slice(0, 5)
            .map((file) => {
              const result = results[file.file_id];
              return (
                <div
                  key={file.file_id}
                  className="mt-5 rounded-xl border border-slate-800 bg-[#0c1422] p-4"
                >
                  <p className="mb-3 text-sm font-medium text-slate-200">
                    #{file.file_id} · {file.original_filename}
                  </p>
                  <p className="mb-1 text-xs text-slate-500">Stored SHA-256</p>
                  <p className="break-all rounded-lg bg-[#080d18] p-3 font-mono text-xs text-slate-300">
                    {result.stored_hash || "Not returned"}
                  </p>
                  <p className="mb-1 mt-3 text-xs text-slate-500">Current SHA-256</p>
                  <p className="break-all rounded-lg bg-[#080d18] p-3 font-mono text-xs text-cyan-300">
                    {result.current_hash || "Not returned"}
                  </p>
                </div>
              );
            })}
        </section>
      )}
    </div>
  );
}


// --------------------------------------------------
// LOG EXPLORER PAGE — DAY 12
// --------------------------------------------------

function LogExplorerPage({ files }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [fileFilter, setFileFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError("");

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const response = await api.get(
              `/api/ingest/files/${file.file_id}/normalized`
            );
            const normalizedEvents = Array.isArray(response.data?.events)
              ? response.data.events
              : [];

            return normalizedEvents.map((event, index) => ({
              ...event,
              _file_id: file.file_id,
              _filename: file.original_filename,
              _source_type: file.source_type,
              _record_index: event.record_index ?? index,
            }));
          } catch {
            return [];
          }
        })
      );

      setEvents(results.flat());
    } catch {
      setError("Unable to load normalized events. Check the backend connection.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [files]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const severity = String(event.severity || "").toLowerCase();
      const searchableText = JSON.stringify(event).toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);
      const matchesSeverity =
        severityFilter === "all" || severity === severityFilter;
      const matchesFile =
        fileFilter === "all" || String(event._file_id) === fileFilter;

      return matchesSearch && matchesSeverity && matchesFile;
    });
  }, [events, searchTerm, severityFilter, fileFilter]);

  const severityClass = (severity) => {
    const value = String(severity || "").toLowerCase();
    if (value === "critical") return "bg-red-500/15 text-red-300";
    if (value === "high") return "bg-orange-500/15 text-orange-300";
    if (value === "medium") return "bg-amber-500/15 text-amber-300";
    if (value === "low") return "bg-emerald-500/15 text-emerald-300";
    return "bg-slate-500/15 text-slate-300";
  };

  return (
    <div className="space-y-7 p-5 md:p-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-400">NORMALIZED SECURITY DATA</p>
          <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            Log Explorer
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Search, filter and inspect normalized events stored in ULPF.
          </p>
        </div>
        <button
          onClick={loadEvents}
          disabled={loadingEvents}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111b2b] px-4 py-3 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loadingEvents ? "animate-spin" : ""}`} />
          Refresh Events
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <p className="text-sm text-slate-400">Total Normalized Events</p>
          <p className="mt-3 text-3xl font-bold text-white">{events.length}</p>
          <Workflow className="mt-2 h-5 w-5 text-cyan-400" />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <p className="text-sm text-slate-400">Filtered Events</p>
          <p className="mt-3 text-3xl font-bold text-white">{filteredEvents.length}</p>
          <Filter className="mt-2 h-5 w-5 text-violet-400" />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
          <p className="text-sm text-slate-400">Files With Events</p>
          <p className="mt-3 text-3xl font-bold text-white">
            {new Set(events.map((event) => event._file_id)).size}
          </p>
          <Files className="mt-2 h-5 w-5 text-emerald-400" />
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Search and Filter Events</h2>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search username, IP, event type..."
            className="rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          />
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={fileFilter}
            onChange={(event) => setFileFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">All Source Files</option>
            {files.map((file) => (
              <option key={file.file_id} value={String(file.file_id)}>
                #{file.file_id} - {file.original_filename}
              </option>
            ))}
          </select>
        </div>
        {(searchTerm || severityFilter !== "all" || fileFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSeverityFilter("all");
              setFileFilter("all");
            }}
            className="mt-4 flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Normalized Log Events</h2>
            <p className="mt-1 text-xs text-slate-500">
              Select an event to inspect its normalized and original data.
            </p>
          </div>
          <FileText className="h-5 w-5 text-cyan-400" />
        </div>

        {loadingEvents ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
            Loading normalized events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3 font-medium text-slate-300">No normalized events found</p>
            <p className="mt-2 text-xs text-slate-500">
              Upload a file, parse it and normalize it in File Management first.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-4">File</th>
                  <th className="px-3 py-4">Timestamp</th>
                  <th className="px-3 py-4">Username</th>
                  <th className="px-3 py-4">Source IP</th>
                  <th className="px-3 py-4">Event Type</th>
                  <th className="px-3 py-4">Severity</th>
                  <th className="px-3 py-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event, index) => (
                  <tr
                    key={`${event._file_id}-${event._record_index}-${index}`}
                    className="border-b border-slate-800/70 hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-4 text-xs text-slate-400">
                      {event._filename}
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-400">
                      {event.timestamp || "—"}
                    </td>
                    <td className="px-3 py-4 text-slate-200">
                      {event.username || "—"}
                    </td>
                    <td className="px-3 py-4 font-mono text-xs text-cyan-300">
                      {event.source_ip || "—"}
                    </td>
                    <td className="px-3 py-4 text-slate-300">
                      {event.event_type || "—"}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${severityClass(event.severity)}`}>
                        {event.severity || "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="rounded-lg border border-slate-700 p-2 text-cyan-400 hover:bg-cyan-400/10"
                        title="View event details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedEvent && (
        <section className="rounded-2xl border border-cyan-400/20 bg-[#111b2b] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-cyan-400">
                EVENT DETAILS
              </p>
              <h2 className="mt-2 font-bold text-white">
                {selectedEvent.event_type || "Security Event"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedEvent._filename} · Record #{selectedEvent._record_index}
              </p>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
              title="Close event details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Timestamp", selectedEvent.timestamp],
              ["Username", selectedEvent.username],
              ["Source IP", selectedEvent.source_ip],
              ["Destination IP", selectedEvent.destination_ip],
              ["Event Type", selectedEvent.event_type],
              ["Severity", selectedEvent.severity],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-[#0c1422] p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 break-words text-sm text-slate-200">{value || "—"}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs text-slate-500">Original Raw Event</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0c1422] p-4 text-xs text-cyan-200">
              {JSON.stringify(selectedEvent.raw_event ?? selectedEvent, null, 2)}
            </pre>
          </div>
          {selectedEvent.data_quality && (
            <div className="mt-5">
              <p className="mb-2 text-xs text-slate-500">Data Quality Information</p>
              <pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0c1422] p-4 text-xs text-slate-300">
                {JSON.stringify(selectedEvent.data_quality, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// --------------------------------------------------
// DATA QUALITY PAGE
// --------------------------------------------------

function DataQualityPage({ files }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState("");
  const [fileFilter, setFileFilter] = useState("all");

  const loadQualityData = useCallback(async () => {
    setLoadingEvents(true);
    setError("");
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const response = await api.get(
              `/api/ingest/files/${file.file_id}/normalized`
            );
            const records = Array.isArray(response.data?.events)
              ? response.data.events
              : [];
            return records.map((record, index) => ({
              ...record,
              _file_id: file.file_id,
              _filename: file.original_filename,
              _record_index: record.record_index ?? index,
            }));
          } catch {
            return [];
          }
        })
      );
      setEvents(results.flat());
    } catch {
      setError("Unable to load data quality information. Check that the backend is running.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [files]);

  useEffect(() => {
    loadQualityData();
  }, [loadQualityData]);

  const filteredEvents = useMemo(
    () => events.filter((event) => fileFilter === "all" || String(event._file_id) === fileFilter),
    [events, fileFilter]
  );

  const qualityStats = useMemo(() => {
    const assessed = filteredEvents.filter((event) => event.data_quality && typeof event.data_quality === "object");
    const validRecords = assessed.filter((event) => {
      const quality = event.data_quality;
      const hasFailedCheck = Object.entries(quality).some(
        ([key, value]) => key.endsWith("_valid") && value === false
      );
      const issues = Array.isArray(quality.quality_issues) ? quality.quality_issues : [];
      return !hasFailedCheck && issues.length === 0;
    });
    const invalidRecords = assessed.length - validRecords.length;
    const unassessed = filteredEvents.length - assessed.length;
    const score = assessed.length ? Math.round((validRecords.length / assessed.length) * 100) : 0;

    const checks = [
      ["Timestamp", "timestamp_valid"],
      ["Source IP", "source_ip_valid"],
      ["Destination IP", "destination_ip_valid"],
      ["Username", "username_valid"],
      ["Event Type", "event_type_valid"],
    ].map(([label, key]) => ({
      label,
      failed: assessed.filter((event) => event.data_quality?.[key] === false).length,
      passed: assessed.filter((event) => event.data_quality?.[key] === true).length,
    }));

    const issueCounts = {};
    assessed.forEach((event) => {
      const issues = Array.isArray(event.data_quality?.quality_issues)
        ? event.data_quality.quality_issues
        : [];
      issues.forEach((issue) => {
        const label = String(issue);
        issueCounts[label] = (issueCounts[label] || 0) + 1;
      });
    });

    return { total: filteredEvents.length, assessed: assessed.length, validRecords, invalidRecords, unassessed, score, checks, issueCounts };
  }, [filteredEvents]);

  const maxCheckCount = Math.max(1, ...qualityStats.checks.map((item) => item.failed + item.passed));

  const metricCards = [
    { label: "Total Normalized Records", value: qualityStats.total, icon: Database, color: "text-cyan-400", detail: "Records analyzed" },
    { label: "Valid Records", value: qualityStats.validRecords.length, icon: CheckCircle2, color: "text-emerald-400", detail: "Passed all available checks" },
    { label: "Invalid Records", value: qualityStats.invalidRecords, icon: AlertTriangle, color: "text-rose-400", detail: "Contain one or more failed checks" },
    { label: "Data Quality Score", value: `${qualityStats.score}%`, icon: ChartNoAxesCombined, color: "text-violet-400", detail: `${qualityStats.assessed} records assessed` },
  ];

  return (
    <div className="space-y-7 p-5 md:p-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-400">ULPF ANALYTICS</p>
          <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">Data Quality Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Measure completeness and validation quality of normalized security records.</p>
        </div>
        <button onClick={loadQualityData} disabled={loadingEvents} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111b2b] px-4 py-3 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loadingEvents ? "animate-spin" : ""}`} /> Refresh Quality Data
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="quality-file-filter">Filter by source file</label>
        <select id="quality-file-filter" value={fileFilter} onChange={(event) => setFileFilter(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-[#0c1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 md:max-w-md">
          <option value="all">All Source Files</option>
          {files.map((file) => <option key={file.file_id} value={String(file.file_id)}>#{file.file_id} - {file.original_filename}</option>)}
        </select>
      </section>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      {loadingEvents ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] py-16 text-center text-sm text-slate-400"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />Loading data quality information...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => {
              const Icon = card.icon;
              return <div key={card.label} className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{card.label}</p><Icon className={`h-5 w-5 ${card.color}`} /></div><p className="mt-4 text-3xl font-bold text-white">{card.value}</p><p className="mt-2 text-xs text-slate-500">{card.detail}</p></div>;
            })}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5 lg:col-span-1">
              <h2 className="font-semibold text-white">Overall Quality Score</h2>
              <div className="mt-6 flex items-center justify-center">
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-[12px] border-cyan-400/20" style={{ background: `conic-gradient(#22d3ee ${qualityStats.score * 3.6}deg, #1e293b 0deg)` }}>
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#111b2b]"><span className="text-3xl font-bold text-white">{qualityStats.score}%</span></div>
                </div>
              </div>
              <p className="mt-5 text-center text-xs text-slate-500">Calculated from records with available data-quality checks.</p>
              {qualityStats.unassessed > 0 && <p className="mt-3 text-center text-xs text-amber-300">{qualityStats.unassessed} record(s) have no quality metadata and are excluded from the score.</p>}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5 lg:col-span-2">
              <h2 className="font-semibold text-white">Validation by Field</h2>
              <p className="mt-1 text-xs text-slate-500">Counts are based on explicit true/false validation flags.</p>
              <div className="mt-6 space-y-5">
                {qualityStats.checks.map((check) => (
                  <div key={check.label}>
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-300">{check.label}</span><span className="text-xs text-slate-500">{check.passed} passed · {check.failed} failed</span></div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-800"><div className="bg-emerald-400" style={{ width: `${(check.passed / maxCheckCount) * 100}%` }} /><div className="bg-rose-400" style={{ width: `${(check.failed / maxCheckCount) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
              <h2 className="font-semibold text-white">Record Validation Summary</h2>
              <div className="mt-5 space-y-4">
                {[{ label: "Valid records", value: qualityStats.validRecords.length, color: "bg-emerald-400" }, { label: "Invalid records", value: qualityStats.invalidRecords, color: "bg-rose-400" }, { label: "Not assessed", value: qualityStats.unassessed, color: "bg-amber-400" }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0c1422] p-4"><div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${item.color}`} /><span className="text-sm text-slate-300">{item.label}</span></div><span className="font-semibold text-white">{item.value}</span></div>)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
              <h2 className="font-semibold text-white">Reported Quality Issues</h2>
              {Object.keys(qualityStats.issueCounts).length === 0 ? <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-300"><CheckCircle2 className="mb-2 h-5 w-5" />No explicit quality issue messages were reported for these records.</div> : <div className="mt-4 space-y-3">{Object.entries(qualityStats.issueCounts).sort((a, b) => b[1] - a[1]).map(([issue, count]) => <div key={issue} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1422] p-3"><span className="break-words text-sm text-slate-300">{issue}</span><span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-300">{count}</span></div>)}</div>}
            </div>
          </section>

          {qualityStats.total === 0 && <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-10 text-center"><Database className="mx-auto h-9 w-9 text-slate-500" /><p className="mt-3 font-medium text-slate-300">No normalized records found</p><p className="mt-2 text-xs text-slate-500">Upload a log file, parse it and normalize it in File Management to populate this dashboard.</p></div>}
        </>
      )}
    </div>
  );
}

// --------------------------------------------------
// DASHBOARD PAGE
// --------------------------------------------------

function NormalizationPage({ files, onRefresh }) {
  const [selectedFileId, setSelectedFileId] = useState("");
  const [records, setRecords] = useState([]);
  const [normalized, setNormalized] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedFile = files.find(
    (file) => String(file.file_id) === String(selectedFileId)
  );

  const loadFileData = async (fileId) => {
    if (!fileId) {
      setRecords([]);
      setNormalized([]);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [recordsResult, normalizedResult] = await Promise.allSettled([
        api.get(`/api/ingest/files/${fileId}/records`),
        api.get(`/api/ingest/files/${fileId}/normalized`),
      ]);
      if (recordsResult.status === "fulfilled") {
        setRecords(recordsResult.value.data.records || []);
      } else {
        setRecords([]);
        setError(recordsResult.reason?.response?.data?.detail || "Could not load parsed records.");
      }
      setNormalized(
        normalizedResult.status === "fulfilled"
          ? normalizedResult.value.data.events || []
          : []
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load file records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFileId) loadFileData(selectedFileId);
    // Loading is intentionally triggered only when the selected file changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  const parsedCount = records.filter((record) => record.status === "parsed").length;
  const failedCount = records.filter((record) => record.status !== "parsed").length;

  const runNormalization = async () => {
    if (!selectedFileId) return;
    setProcessing(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post(`/api/ingest/files/${selectedFileId}/normalize`);
      setMessage(`Normalization completed: ${response.data.normalized_count ?? 0} records normalized.`);
      await loadFileData(selectedFileId);
      await onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Normalization failed. Check that the file has been parsed first.");
    } finally {
      setProcessing(false);
    }
  };

  const getValue = (event, key) => {
    const value = event?.[key];
    return value === null || value === undefined || value === "" ? "—" : String(value);
  };

  return (
    <div className="space-y-7 p-5 md:p-8">
      <section>
        <p className="text-sm text-cyan-400">ULPF MODULE</p>
        <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">Log Normalization</h1>
        <p className="mt-2 text-sm text-slate-400">Convert parsed events from different log formats into a consistent, standardized structure.</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Files className="h-5 w-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Select an ingested file</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedFileId}
            onChange={(event) => setSelectedFileId(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="">Choose a file to inspect...</option>
            {files.map((file) => (
              <option key={file.file_id} value={file.file_id}>
                {file.original_filename} (ID: {file.file_id})
              </option>
            ))}
          </select>
          <button
            onClick={() => loadFileData(selectedFileId)}
            disabled={!selectedFileId || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        {selectedFile && (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-[#0b1220] p-3"><p className="text-slate-500">Source format</p><p className="mt-1 font-medium uppercase text-white">{selectedFile.source_type || "Unknown"}</p></div>
            <div className="rounded-lg bg-[#0b1220] p-3"><p className="text-slate-500">File status</p><p className="mt-1 font-medium capitalize text-white">{selectedFile.status || "Unknown"}</p></div>
            <div className="rounded-lg bg-[#0b1220] p-3"><p className="text-slate-500">File ID</p><p className="mt-1 font-medium text-white">{selectedFile.file_id}</p></div>
          </div>
        )}
      </section>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {message && <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-[#111b2b] p-5"><p className="text-sm text-slate-400">Parsed records</p><p className="mt-2 text-3xl font-bold text-white">{selectedFileId ? parsedCount : "—"}</p></div>
        <div className="rounded-xl border border-slate-800 bg-[#111b2b] p-5"><p className="text-sm text-slate-400">Normalized records</p><p className="mt-2 text-3xl font-bold text-cyan-400">{selectedFileId ? normalized.length : "—"}</p></div>
        <div className="rounded-xl border border-slate-800 bg-[#111b2b] p-5"><p className="text-sm text-slate-400">Parsing errors</p><p className="mt-2 text-3xl font-bold text-amber-400">{selectedFileId ? failedCount : "—"}</p></div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-white">Normalization process</h2><p className="mt-1 text-sm text-slate-400">Select a file and ensure it has parsed records before running normalization.</p></div>
          <button onClick={runNormalization} disabled={!selectedFileId || processing || loading || parsedCount === 0} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">
            <WandSparkles className="h-4 w-4" />{processing ? "Normalizing..." : "Run Normalization"}
          </button>
        </div>
        {!selectedFileId && <p className="mt-5 rounded-lg bg-[#0b1220] p-4 text-sm text-slate-400">Choose an ingested file above to view its parsed and normalized records.</p>}
        {selectedFileId && !loading && parsedCount === 0 && <p className="mt-5 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-300">No successfully parsed records found. Open File Management, parse this file, then return here.</p>}
        {loading && <p className="mt-5 text-sm text-slate-400">Loading file records...</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111b2b]">
        <div className="border-b border-slate-800 p-5"><h2 className="font-semibold text-white">Normalized event records</h2><p className="mt-1 text-sm text-slate-400">Standardized fields produced by the ULPF normalizer.</p></div>
        {!normalized.length ? (
          <div className="p-8 text-center"><Workflow className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm text-slate-400">No normalized records available for this file yet.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#0b1220] text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Source IP</th><th className="px-4 py-3">Event type</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Data quality</th></tr></thead>
            <tbody className="divide-y divide-slate-800">{normalized.map((event, index) => {
              const quality = event.data_quality || {};
              const issues = quality.quality_issues || quality.issues || [];
              return <tr key={event.id || event.record_index || index} className="text-slate-300 hover:bg-white/[0.02]"><td className="px-4 py-3">{event.record_index ?? index + 1}</td><td className="px-4 py-3">{getValue(event, "timestamp")}</td><td className="px-4 py-3">{getValue(event, "username")}</td><td className="px-4 py-3">{getValue(event, "source_ip")}</td><td className="px-4 py-3">{getValue(event, "event_type")}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-700/60 px-2 py-1 text-xs uppercase">{getValue(event, "severity")}</span></td><td className="px-4 py-3">{issues.length ? <span className="text-amber-300">{issues.length} issue(s)</span> : <span className="text-emerald-300">No issues</span>}</td></tr>;
            })}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}

function DashboardPage({
  files,
  metrics,
  loading,
  backendOnline,
  error,
}) {
  return (
    <div className="space-y-7 p-5 md:p-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-400">SECURITY MANAGEMENT</p>
          <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            Security Overview
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Monitor, process and normalize your security logs.
          </p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
            backendOnline
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/20 bg-amber-500/10 text-amber-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          <span className="text-xs font-medium">
            {backendOnline ? "Backend Connected" : "Backend Offline"}
          </span>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Backend connection error</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5 transition hover:-translate-y-1 hover:border-slate-600"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{metric.title}</p>
                <div className={`rounded-xl p-3 ${metric.background}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
              <h3 className="mt-5 text-3xl font-bold text-white">
                {loading ? "..." : metric.value}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {metric.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">
                Log Processing Pipeline
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Core ULPF processing architecture
              </p>
            </div>
            <Workflow className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
            {[
              { name: "Ingestion", icon: UploadCloud },
              { name: "Integrity", icon: LockKeyhole },
              { name: "Parsing", icon: Search },
              { name: "Normalization", icon: Workflow },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.name}
                  className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-slate-700 bg-[#0c1422] p-4 text-center"
                >
                  <div className="rounded-xl bg-cyan-400/10 p-3">
                    <Icon className="h-6 w-6 text-cyan-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">
                    {step.name}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Processing stage {index + 1}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
            <p className="text-xs leading-6 text-slate-400">
              ULPF receives raw security logs, verifies file integrity,
              extracts events and transforms them into standardized
              records for further security analysis.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">System Components</h3>
          </div>

          <div className="mt-6 space-y-5">
            {[
              {
                name: "React Frontend",
                status: "Running",
                icon: LayoutDashboard,
                online: true,
              },
              {
                name: "FastAPI Backend",
                status: backendOnline ? "Connected" : "Offline",
                icon: Server,
                online: backendOnline,
              },
              {
                name: "SQLite Database",
                status: backendOnline ? "Accessible" : "Not checked",
                icon: Database,
                online: backendOnline,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      item.online ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-7 border-t border-slate-800 pt-5">
            <p className="text-xs leading-5 text-slate-500">
              Backend health is checked through the FastAPI health endpoint.
              Database access is inferred from the successful API request.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Recent File Activity</h3>
            <p className="mt-1 text-xs text-slate-500">
              Latest ingested security files
            </p>
          </div>
          <Files className="h-5 w-5 text-cyan-400" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Loading file activity...
          </p>
        ) : files.length === 0 ? (
          <div className="py-10 text-center">
            <Files className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-4 text-sm font-medium text-slate-300">
              No files found
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Upload a log file to see its activity here.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-3">Filename</th>
                  <th className="px-3 py-3">Format</th>
                  <th className="px-3 py-3">Size</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {files.slice(0, 10).map((file) => (
                  <tr
                    key={file.file_id}
                    className="border-b border-slate-800/70 hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-4 font-medium text-slate-200">
                      {file.original_filename}
                    </td>
                    <td className="px-3 py-4 uppercase text-slate-400">
                      {file.source_type}
                    </td>
                    <td className="px-3 py-4 text-slate-400">
                      {formatSize(file.size_bytes)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${statusStyle(file.status)}`}
                      >
                        {file.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500">
                      {formatDate(file.received_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-5 text-xs text-slate-500">
        <p>ULPF – Universal Log Pre-processing Framework</p>
        <p>React Frontend · Development Version 1.0</p>
      </footer>
    </div>
  );
}

// --------------------------------------------------
// SYSTEM HEALTH PAGE
// --------------------------------------------------

function SystemHealthPage({ files, backendOnline, onRefresh, loading }) {
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [healthData, setHealthData] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState("Checking");
  const [activity, setActivity] = useState([]);
  const [counts, setCounts] = useState({ parsed: 0, normalized: 0, issues: 0 });
  const [lastChecked, setLastChecked] = useState(null);

  const checkSystem = useCallback(async () => {
    setHealthLoading(true);
    setHealthError("");

    const healthResult = await Promise.allSettled([
      api.get("/health"),
      api.get("/api/raw-logs"),
    ]);

    if (healthResult[0].status === "fulfilled") {
      setHealthData(healthResult[0].value.data || {});
    } else {
      setHealthData(null);
      setHealthError(
        healthResult[0].reason?.response?.data?.detail ||
          "Health endpoint is unavailable. Check that the FastAPI server is running."
      );
    }

    setDatabaseStatus(healthResult[1].status === "fulfilled" ? "Connected" : "Unable to verify");

    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const [recordsResult, normalizedResult] = await Promise.allSettled([
          api.get(`/api/ingest/files/${file.file_id}/records`),
          api.get(`/api/ingest/files/${file.file_id}/normalized`),
        ]);
        const records = recordsResult.status === "fulfilled"
          ? recordsResult.value.data?.records || []
          : [];
        const normalized = normalizedResult.status === "fulfilled"
          ? normalizedResult.value.data?.events || []
          : [];
        const issueCount = normalized.reduce(
          (sum, event) => sum + (event.data_quality?.quality_issues?.length || 0), 0
        );
        return {
          parsed: records.filter((record) => record.status === "parsed").length,
          normalized: normalized.length,
          issues: issueCount,
          file,
        };
      })
    );

    setCounts({
      parsed: fileDetails.reduce((sum, item) => sum + item.parsed, 0),
      normalized: fileDetails.reduce((sum, item) => sum + item.normalized, 0),
      issues: fileDetails.reduce((sum, item) => sum + item.issues, 0),
    });
    setActivity(
      [...files]
        .sort((a, b) => new Date(b.received_at || 0) - new Date(a.received_at || 0))
        .slice(0, 6)
    );
    setLastChecked(new Date());
    setHealthLoading(false);
  }, [files]);

  useEffect(() => {
    checkSystem();
  }, [checkSystem]);

  const apiHealthy = healthData?.status === "healthy";
  const healthCards = [
    { label: "Ingested Files", value: files.length, detail: "Files registered in ULPF", icon: Files, color: "text-cyan-400" },
    { label: "Parsed Records", value: counts.parsed, detail: "Records parsed successfully", icon: Workflow, color: "text-violet-400" },
    { label: "Normalized Records", value: counts.normalized, detail: "Records normalized", icon: Database, color: "text-emerald-400" },
    { label: "Quality Issues", value: counts.issues, detail: "Issues reported by validation", icon: AlertTriangle, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6 p-5 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-cyan-400">ULPF MONITORING</p>
          <h1 className="mt-2 text-2xl font-bold text-white">System Health</h1>
          <p className="mt-2 text-sm text-slate-400">Monitor backend availability, database access and log-processing activity.</p>
        </div>
        <button
          onClick={() => { onRefresh(); checkSystem(); }}
          disabled={healthLoading || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111b2b] px-4 py-3 text-sm text-slate-200 hover:border-cyan-400/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${healthLoading || loading ? "animate-spin" : ""}`} />
          Refresh Health
        </button>
      </div>

      {healthError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{healthError}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {healthCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-[#111b2b] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{card.label}</p>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{healthLoading ? "—" : card.value}</p>
              <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
          <h3 className="font-semibold text-white">Service Status</h3>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1524] p-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-cyan-400" />
                <div><p className="text-sm font-medium text-white">FastAPI Backend</p><p className="text-xs text-slate-500">GET /health</p></div>
              </div>
              <span className={`inline-flex items-center gap-2 text-sm ${apiHealthy ? "text-emerald-400" : "text-rose-400"}`}>
                {apiHealthy ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {healthLoading ? "Checking" : apiHealthy ? "Healthy" : "Unavailable"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1524] p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-violet-400" />
                <div><p className="text-sm font-medium text-white">Database/API Storage</p><p className="text-xs text-slate-500">GET /api/raw-logs connectivity check</p></div>
              </div>
              <span className={`inline-flex items-center gap-2 text-sm ${databaseStatus === "Connected" ? "text-emerald-400" : "text-amber-400"}`}>
                {databaseStatus === "Connected" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {healthLoading ? "Checking" : databaseStatus}
              </span>
            </div>
          </div>
          {healthData && <p className="mt-4 text-xs text-slate-500">Backend response: {healthData.status || "Response received"}</p>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
          <h3 className="font-semibold text-white">Monitoring Summary</h3>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Files registered</span><span className="font-semibold text-white">{files.length}</span></div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Parsed records</span><span className="font-semibold text-white">{counts.parsed}</span></div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Normalized records</span><span className="font-semibold text-white">{counts.normalized}</span></div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Reported quality issues</span><span className="font-semibold text-amber-300">{counts.issues}</span></div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Last checked</span><span className="text-xs text-slate-400">{lastChecked ? lastChecked.toLocaleTimeString() : "—"}</span></div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="font-semibold text-white">Recent Ingestion Activity</h3><p className="mt-1 text-xs text-slate-500">Most recently received files</p></div>
          <Clock className="h-5 w-5 text-cyan-400" />
        </div>
        {activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No ingestion activity is available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs text-slate-500"><tr><th className="px-3 py-3">Filename</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Received</th></tr></thead>
              <tbody>{activity.map((file) => <tr key={file.file_id} className="border-b border-slate-800/70"><td className="px-3 py-4 font-medium text-slate-200">{file.original_filename}</td><td className="px-3 py-4 uppercase text-slate-400">{file.source_type}</td><td className="px-3 py-4 text-slate-300">{file.status}</td><td className="px-3 py-4 text-xs text-slate-500">{formatDate(file.received_at)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-600">Health indicators reflect the latest successful API checks. A failed connectivity check is reported as unavailable and does not modify stored logs.</p>
    </div>
  );
}

// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [metrics, setMetrics] = useState(initialMetrics);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [healthResponse, filesResponse] = await Promise.all([
        api.get("/health"),
        api.get("/api/ingest/files"),
      ]);

      setBackendOnline(healthResponse.data?.status === "healthy");

      const fileList = Array.isArray(filesResponse.data)
        ? filesResponse.data
        : [];

      setFiles(fileList);

      const details = await Promise.all(
        fileList.map(async (file) => {
          const fileId = file.file_id;

          const [recordsResult, verifyResult, normalizedResult] =
            await Promise.allSettled([
              api.get(`/api/ingest/files/${fileId}/records`),
              api.get(`/api/ingest/files/${fileId}/verify`),
              api.get(`/api/ingest/files/${fileId}/normalized`),
            ]);

          const records =
            recordsResult.status === "fulfilled"
              ? recordsResult.value.data.records || []
              : [];

          const normalized =
            normalizedResult.status === "fulfilled"
              ? normalizedResult.value.data.events || []
              : [];

          const verified =
            verifyResult.status === "fulfilled" &&
            verifyResult.value.data.integrity_verified === true;

          const qualityIssues = normalized.reduce(
            (total, event) =>
              total +
              (event.data_quality?.quality_issues?.length || 0),
            0
          );

          return {
            parsedEvents: records.filter(
              (record) => record.status === "parsed"
            ).length,
            verified,
            qualityIssues,
          };
        })
      );

      const parsedCount = details.reduce(
        (total, item) => total + item.parsedEvents,
        0
      );

      const verifiedCount = details.filter(
        (item) => item.verified
      ).length;

      const qualityCount = details.reduce(
        (total, item) => total + item.qualityIssues,
        0
      );

      setMetrics([
        {
          ...initialMetrics[0],
          value: fileList.length,
          description: "Files stored in ULPF",
        },
        {
          ...initialMetrics[1],
          value: parsedCount,
          description: "Successfully parsed events",
        },
        {
          ...initialMetrics[2],
          value: verifiedCount,
          description: `Out of ${fileList.length} files`,
        },
        {
          ...initialMetrics[3],
          value: qualityCount,
          description: "Issues in normalized events",
        },
      ]);
    } catch (err) {
      setBackendOnline(false);
      setError(
        err.response?.data?.detail ||
          "Unable to connect to the ULPF backend. Check that FastAPI is running."
      );
      setFiles([]);
      setMetrics(initialMetrics);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-[#0d1524] transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
          </div>

          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold tracking-wide text-white">
                ULPF<span className="text-cyan-400">.</span>
              </h1>
              <p className="text-[10px] tracking-widest text-slate-500">
                SECURITY PLATFORM
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-6">
          {sidebarOpen && (
            <p className="mb-4 px-3 text-[10px] font-semibold tracking-[2px] text-slate-500">
              MAIN MENU
            </p>
          )}

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => setActivePage(item.name)}
                  title={item.name}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                    active
                      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-slate-800">
            <Settings className="h-5 w-5" />
            {sidebarOpen && "Settings"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-[#080d18]/95 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-semibold text-white">
                {activePage}
              </h2>
              <p className="text-xs text-slate-500">
                Universal Log Pre-processing Framework
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadDashboard}
              disabled={loading}
              title="Refresh dashboard"
              className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-cyan-400 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            <div className="relative rounded-lg border border-slate-800 p-2 text-slate-400">
              <Bell className="h-5 w-5" />
            </div>

            <div className="hidden items-center gap-3 border-l border-slate-800 pl-4 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">
                U
              </div>
              <div>
                <p className="text-sm font-medium text-white">ULPF Admin</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </header>

        {/* PAGE SWITCHING */}
        {activePage === "Log Ingestion" ? (
          <LogIngestionPage onUploadSuccess={loadDashboard} />
        ) : activePage === "File Management" ? (
          <FileManagementPage
            files={files}
            onRefresh={loadDashboard}
            loading={loading}
          />
        ) : activePage === "Integrity Monitor" ? (
          <IntegrityMonitorPage
            files={files}
            onRefresh={loadDashboard}
            loading={loading}
          />
        ) : activePage === "Log Explorer" ? (
          <LogExplorerPage files={files} />
        ) : activePage === "Normalization" ? (
          <NormalizationPage files={files} onRefresh={loadDashboard} />
        ) : activePage === "Data Quality" ? (
          <DataQualityPage files={files} />
        ) : activePage === "System Health" ? (
          <SystemHealthPage
            files={files}
            backendOnline={backendOnline}
            onRefresh={loadDashboard}
            loading={loading}
          />
        ) : activePage === "Dashboard" ? (
          <DashboardPage
            files={files}
            metrics={metrics}
            loading={loading}
            backendOnline={backendOnline}
            error={error}
          />
        ) : (
          <div className="space-y-4 p-5 md:p-8">
            <p className="text-sm text-cyan-400">ULPF MODULE</p>
            <h1 className="text-2xl font-bold text-white">{activePage}</h1>
            <div className="rounded-2xl border border-slate-800 bg-[#111b2b] p-6">
              <p className="text-sm text-slate-400">
                This module is planned for a later development day.
                File ingestion, file management and dashboard modules
                are currently available.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

"use client";
import { useState } from "react";
import { Download, AlertCircle, CheckCircle, Loader } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [formats, setFormats] = useState("");
  const [formatId, setFormatId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null);

  const fetchFormats = async () => {
    if (!url.trim()) {
      setStatus("Please enter a YouTube URL");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStatusType("info");
    setStatus("Fetching available formats...");
    
    try {
      const res = await fetch("/api/formats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      
      if (data.error) {
        setFormats(data.error);
        setStatusType("error");
        setStatus("Failed to fetch formats");
      } else {
        setFormats(data.formats);
        setShowFormats(true);
        setStatusType("success");
        setStatus("Formats loaded successfully!");
      }
    } catch {
      setStatusType("error");
      setStatus("Error fetching formats");
      setFormats("Error: Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async () => {
    if (!url.trim()) {
      setStatus("Please enter a YouTube URL");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStatusType("info");
    setStatus("Starting download...");
    
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, formatId: formatId || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusType("error");
        setStatus(data.error || "Download failed");
        return;
      }

      // Instead of downloading the blob through the server, we just redirect the user to the direct RapidAPI download link!
      // This bypasses Vercel entirely, saves massive bandwidth, and fixes the Vercel IP blocking error.
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.target = "_blank";
      link.download = data.filename || "video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusType("success");
      setStatus(`Download complete!`);
    } catch {
      setStatusType("error");
      setStatus("Error starting download");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    setUrl(pastedText);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Download className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Video Downloader</h1>
          </div>
          <p className="text-slate-300 text-lg">Download videos easily with your preferred quality</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50">
          
          {/* URL Input Section */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Video URL
            </label>
            <input
              type="text"
              placeholder="Paste your YouTube URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePaste}
              className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          {/* Format Selection Section */}
          <div className="mb-8 pb-8 border-b border-slate-700/50">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={fetchFormats}
                disabled={loading || !url.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Check Formats"
                )}
              </button>
            </div>

            {/* Format List */}
            {showFormats && formats && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Available Formats
                </label>
                <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto border border-slate-700/50">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                    {formats}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Quality Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Format ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 22, 18, or best (leave empty for best)"
              value={formatId}
              onChange={(e) => setFormatId(e.target.value)}
              className="w-full px-5 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            <p className="text-xs text-slate-400 mt-2">
              Leave empty to download with the best quality available
            </p>
          </div>

          {/* Download Button */}
          <button
            onClick={downloadVideo}
            disabled={loading || !url.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold text-lg rounded-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Download Video
              </>
            )}
          </button>

          {/* Status Message */}
          {status && (
            <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
              statusType === "success" ? "bg-green-500/10 border border-green-500/30" :
              statusType === "error" ? "bg-red-500/10 border border-red-500/30" :
              "bg-blue-500/10 border border-blue-500/30"
            }`}>
              {statusType === "success" && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
              {statusType === "error" && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
              {statusType === "info" && <Loader className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />}
              <p className={`text-sm font-medium ${
                statusType === "success" ? "text-green-300" :
                statusType === "error" ? "text-red-300" :
                "text-blue-300"
              }`}>
                {status}
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Videos are downloaded directly to your device</p>
        </div>
      </div>
    </main>
  );
}
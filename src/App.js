// import React, { useState, useEffect } from 'react';
// import { Search, Clock, Cookie, AlertCircle, CheckCircle, Loader, Download, XCircle } from 'lucide-react';

// const CookieInventoryDashboard = () => {
//   const [url, setUrl] = useState('');
//   const [jobs, setJobs] = useState([]);
//   const [activeJobId, setActiveJobId] = useState(null);
//   const [results, setResults] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const API_BASE = 'http://localhost:8000';

//   useEffect(() => {
//     if (!activeJobId) return;
    
//     const pollInterval = setInterval(async () => {
//       try {
//         const response = await fetch(`${API_BASE}/status/${activeJobId}`);
//         if (!response.ok) throw new Error('Failed to fetch status');
        
//         const statusData = await response.json();
        
//         // Update jobs list
//         setJobs(prevJobs => 
//           prevJobs.map(job => 
//             job.id === activeJobId 
//               ? { ...job, status: statusData.status, progress: statusData.progress }
//               : job
//           )
//         );
        
//         // If completed, fetch results
//         if (statusData.status === 'completed') {
//           clearInterval(pollInterval);
//           await fetchResults(activeJobId);
//           setActiveJobId(null);
//           setLoading(false);
//         }
        
//         // If failed, stop polling
//         if (statusData.status === 'failed') {
//           clearInterval(pollInterval);
//           setError(statusData.error || 'Job failed');
//           setActiveJobId(null);
//           setLoading(false);
//         }
//       } catch (err) {
//         console.error('Polling error:', err);
//         setError(`Polling error: ${err.message}`);
//         clearInterval(pollInterval);
//         setActiveJobId(null);
//         setLoading(false);
//       }
//     }, 2000); // Poll every 2 seconds
    
//     return () => clearInterval(pollInterval);
//   }, [activeJobId]);
  
//   const scanUrl = async () => {
//     if (!url) return;
    
//     setLoading(true);
//     setError(null);
//     setResults(null);
    
//     try {
//       // Validate URL
//       new URL(url);
      
//       const response = await fetch(`${API_BASE}/scan`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           url: url,
//           options: {
//             accept_consent: false,
//             simulate_user_actions: ['scroll'],
//             headless: true,
//             wait_seconds: 30
//           }
//         })
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       // Add job to list
//       const newJob = {
//         id: data.job_id,
//         url: url,
//         status: data.status,
//         createdAt: new Date().toISOString(),
//         progress: 0
//       };
      
//       setJobs(prev => [newJob, ...prev]);
//       setActiveJobId(data.job_id);
      
//     } catch (err) {
//       setError(`Failed to start scan: ${err.message}`);
//       setLoading(false);
//       console.error('Scan error:', err);
//     }
//   };
  
//   const fetchResults = async (jobId) => {
//     try {
//       const response = await fetch(`${API_BASE}/result/${jobId}`);
//       if (!response.ok) throw new Error('Failed to fetch results');
      
//       const data = await response.json();
//       setResults(data);
//     } catch (err) {
//       setError(`Failed to fetch results: ${err.message}`);
//       console.error('Fetch results error:', err);
//     }
//   };
  
//   const downloadCSV = async () => {
//     if (!activeJobId && !results) return;
    
//     try {
//       const jobId = activeJobId || jobs[0]?.id;
//       const response = await fetch(`${API_BASE}/download/${jobId}.csv`);
      
//       if (!response.ok) throw new Error('Failed to download CSV');
      
//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `cookie-inventory-${jobId}.csv`;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       window.URL.revokeObjectURL(url);
//     } catch (err) {
//       setError(`Failed to download CSV: ${err.message}`);
//       console.error('Download error:', err);
//     }
//   };
  
//   const getStatusColor = (status) => {
//     switch(status) {
//       case 'queued': return 'text-yellow-600 bg-yellow-50';
//       case 'running': return 'text-blue-600 bg-blue-50';
//       case 'enriching': return 'text-purple-600 bg-purple-50';
//       case 'completed': return 'text-green-600 bg-green-50';
//       case 'failed': return 'text-red-600 bg-red-50';
//       default: return 'text-gray-600 bg-gray-50';
//     }
//   };
  
//   const getTypeColor = (type) => {
//     switch(type) {
//       case 'Analytics': return 'bg-blue-100 text-blue-800';
//       case 'Advertising': return 'bg-red-100 text-red-800';
//       case 'Functional': return 'bg-green-100 text-green-800';
//       case 'Necessary': return 'bg-purple-100 text-purple-800';
//       case 'Performance': return 'bg-orange-100 text-orange-800';
//       case 'Security': return 'bg-indigo-100 text-indigo-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const activeJob = jobs.find(j => j.id === activeJobId);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
//       <div className="container mx-auto px-4 py-8 max-w-7xl">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center gap-3 mb-2">
//             <Cookie className="w-8 h-8 text-indigo-600" />
//             <h1 className="text-3xl font-bold text-slate-800">Cookie Inventory Service</h1>
//           </div>
//           <p className="text-slate-600">Comprehensive cookie analysis with AI-powered enrichment</p>
//         </div>

//         {/* Error Alert */}
//         {error && (
//           <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
//             <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
//             <div className="flex-1">
//               <h3 className="font-semibold text-red-800 mb-1">Error</h3>
//               <p className="text-sm text-red-700">{error}</p>
//               <button 
//                 onClick={() => setError(null)}
//                 className="text-sm text-red-600 hover:text-red-800 mt-2 underline"
//               >
//                 Dismiss
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Scan Form */}
//         <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
//           <div className="flex gap-3">
//             <div className="flex-1 relative">
//               <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
//               <input
//                 type="url"
//                 value={url}
//                 onChange={(e) => setUrl(e.target.value)}
//                 placeholder="Enter website URL (e.g., https://example.com)"
//                 className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                 onKeyPress={(e) => e.key === 'Enter' && !loading && scanUrl()}
//               />
//             </div>
//             <button
//               onClick={scanUrl}
//               disabled={loading || !url}
//               className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
//             >
//               {loading ? (
//                 <>
//                   <Loader className="w-5 h-5 animate-spin" />
//                   Scanning...
//                 </>
//               ) : (
//                 <>
//                   <Search className="w-5 h-5" />
//                   Scan Site
//                 </>
//               )}
//             </button>
//           </div>
//           <p className="text-xs text-slate-500 mt-2">
//             Backend: {API_BASE} | Ensure backend is running on port 8000
//           </p>
//         </div>

//         {/* Active Job Progress */}
//         {activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed' && (
//           <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
//             <div className="flex items-center justify-between mb-4">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
//                   <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-slate-800">Analyzing {activeJob.url}</h3>
//                   <p className="text-sm text-slate-600 capitalize">{activeJob.status}</p>
//                 </div>
//               </div>
//               <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeJob.status)}`}>
//                 {activeJob.progress}%
//               </span>
//             </div>
//             <div className="w-full bg-slate-200 rounded-full h-2">
//               <div 
//                 className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
//                 style={{ width: `${activeJob.progress}%` }}
//               />
//             </div>
//           </div>
//         )}

//         {/* Results */}
//         {results && results.length > 0 && (
//           <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//             <div className="p-6 border-b border-slate-200 flex items-center justify-between">
//               <div>
//                 <h2 className="text-xl font-semibold text-slate-800 mb-1">Cookie Inventory Results</h2>
//                 <p className="text-sm text-slate-600">{results.length} cookies detected</p>
//               </div>
//               <button
//                 onClick={downloadCSV}
//                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
//               >
//                 <Download className="w-4 h-4" />
//                 Export CSV
//               </button>
//             </div>
            
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead className="bg-slate-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Cookie</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Domain</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Description</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Duration</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Type</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Source</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-200">
//                   {results.map((cookie, idx) => (
//                     <tr key={idx} className="hover:bg-slate-50 transition-colors">
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">
//                           {cookie.cookie}
//                         </code>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
//                         {cookie.domain}
//                       </td>
//                       <td className="px-6 py-4 text-sm text-slate-700 max-w-md">
//                         {cookie.description}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center gap-1 text-sm text-slate-600">
//                           <Clock className="w-4 h-4" />
//                           {cookie.duration_human || cookie.duration}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(cookie.type)}`}>
//                           {cookie.type}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
//                         {cookie.kb_source || 'Unknown'}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {/* No Results Message */}
//         {results && results.length === 0 && (
//           <div className="bg-white rounded-xl shadow-lg p-8 text-center">
//             <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
//             <h3 className="text-lg font-semibold text-slate-800 mb-2">No Cookies Detected</h3>
//             <p className="text-slate-600">The website didn't set any cookies during the scan period.</p>
//           </div>
//         )}

//         {/* Recent Jobs */}
//         {jobs.length > 0 && (
//           <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
//             <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Scans</h3>
//             <div className="space-y-2">
//               {jobs.slice(0, 5).map((job) => (
//                 <div key={job.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
//                   <div className="flex items-center gap-3 flex-1">
//                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(job.status)}`}>
//                       {job.status === 'completed' ? (
//                         <CheckCircle className="w-4 h-4" />
//                       ) : job.status === 'failed' ? (
//                         <AlertCircle className="w-4 h-4" />
//                       ) : (
//                         <Loader className="w-4 h-4 animate-spin" />
//                       )}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-medium text-slate-800 truncate">{job.url}</p>
//                       <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
//                     </div>
//                   </div>
//                   <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
//                     {job.status}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CookieInventoryDashboard;

import React, { useState, useEffect } from 'react';
import { Search, Clock, Cookie, AlertCircle, CheckCircle, Loader, Download, XCircle, ExternalLink, Shield, TrendingUp } from 'lucide-react';

const CookieInventoryDashboard = () => {
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    if (!activeJobId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/status/${activeJobId}`);
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const statusData = await response.json();
        
        setJobs(prevJobs => 
          prevJobs.map(job => 
            job.id === activeJobId 
              ? { ...job, status: statusData.status, progress: statusData.progress }
              : job
          )
        );
        
        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          await fetchResults(activeJobId);
          setActiveJobId(null);
          setLoading(false);
        }
        
        if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          setError(statusData.error || 'Job failed');
          setActiveJobId(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(`Polling error: ${err.message}`);
        clearInterval(pollInterval);
        setActiveJobId(null);
        setLoading(false);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [activeJobId]);
  
  const scanUrl = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      new URL(url);
      
      const response = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          options: {
            accept_consent: false,
            simulate_user_actions: ['scroll'],
            headless: true,
            wait_seconds: 30
          }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      const newJob = {
        id: data.job_id,
        url: url,
        status: data.status,
        createdAt: new Date().toISOString(),
        progress: 0
      };
      
      setJobs(prev => [newJob, ...prev]);
      setActiveJobId(data.job_id);
      
    } catch (err) {
      setError(`Failed to start scan: ${err.message}`);
      setLoading(false);
    }
  };
  
  const fetchResults = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE}/result/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(`Failed to fetch results: ${err.message}`);
    }
  };
  
  const downloadCSV = async () => {
    if (!activeJobId && !results) return;
    
    try {
      const jobId = activeJobId || jobs[0]?.id;
      const response = await fetch(`${API_BASE}/download/${jobId}.csv`);
      if (!response.ok) throw new Error('Failed to download CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cookie-inventory-${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to download CSV: ${err.message}`);
    }
  };
  
  const getStatusStyle = (status) => {
    const styles = {
      queued: 'bg-amber-100 text-amber-800 border-amber-200',
      running: 'bg-blue-100 text-blue-800 border-blue-200',
      enriching: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };
  
  const getTypeStyle = (type) => {
    const styles = {
      Analytics: 'bg-blue-50 text-blue-700 border-blue-200',
      Advertising: 'bg-rose-50 text-rose-700 border-rose-200',
      Functional: 'bg-green-50 text-green-700 border-green-200',
      Necessary: 'bg-purple-50 text-purple-700 border-purple-200',
      Performance: 'bg-orange-50 text-orange-700 border-orange-200',
      Security: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return styles[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getCookieStats = () => {
    if (!results) return null;
    const types = {};
    results.forEach(c => {
      types[c.type] = (types[c.type] || 0) + 1;
    });
    return types;
  };

  const activeJob = jobs.find(j => j.id === activeJobId);
  const stats = getCookieStats();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Cookie size={40} color="#667eea" />
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '700', color: '#1a202c' }}>
              Cookie Scanner
            </h1>
          </div>
          <p style={{ margin: 0, color: '#4a5568', fontSize: '1.1rem' }}>
            ......................................................................................
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fff5f5',
            border: '2px solid #fc8181',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
          }}>
            <XCircle size={24} color="#e53e3e" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#742a2a', fontSize: '1.1rem', fontWeight: '600' }}>
                Error Occurred
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#c53030', fontSize: '0.95rem' }}>{error}</p>
              <button 
                onClick={() => setError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e53e3e',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.9rem'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Scan Form */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
              <Search size={20} color="#a0aec0" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., https://example.com)"
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                onKeyPress={(e) => e.key === 'Enter' && !loading && scanUrl()}
              />
            </div>
            <button
              onClick={scanUrl}
              disabled={loading || !url}
              style={{
                padding: '1rem 2rem',
                background: loading || !url ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || !url ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s',
                boxShadow: loading || !url ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => !loading && !url && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {loading ? (
                <>
                  <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Scanning...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Scan Website
                </>
              )}
            </button>
          </div>
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.85rem', color: '#718096' }}>
            ...................................................................................
          </p>
        </div>

        {/* Active Job Progress */}
        {activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Loader size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: '600', color: '#1a202c' }}>
                    Analyzing Website
                  </h3>
                  <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem' }}>
                    {activeJob.url}
                  </p>
                </div>
              </div>
              <span style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                border: '2px solid'
              }} className={getStatusStyle(activeJob.status)}>
                {activeJob.progress}% Complete
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#e2e8f0',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${activeJob.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.5s ease',
                borderRadius: '10px'
              }} />
            </div>
            <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: '#718096', textTransform: 'capitalize' }}>
              Status: {activeJob.status}
            </p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#718096' }}>Total Cookies</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>{results.length}</p>
                </div>
                <Cookie size={40} color="#667eea" style={{ opacity: 0.3 }} />
              </div>
            </div>
            {Object.entries(stats).slice(0, 3).map(([type, count]) => (
              <div key={type} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#718096' }}>{type}</p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#1a202c' }}>{count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Results Table */}
        {results && results.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '2rem',
              borderBottom: '2px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                  Cookie Inventory Results
                </h2>
                <p style={{ margin: 0, color: '#4a5568' }}>{results.length} cookies detected and analyzed</p>
              </div>
              <button
                onClick={downloadCSV}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7fafc' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cookie Name</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Domain</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((cookie, idx) => (
                    <tr key={idx} style={{
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <code style={{
                          background: '#edf2f7',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          color: '#2d3748',
                          fontWeight: '500'
                        }}>
                          {cookie.cookie}
                        </code>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#4a5568' }}>
                        {cookie.domain}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#2d3748', maxWidth: '400px' }}>
                        {cookie.description}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#4a5568' }}>
                          <Clock size={16} />
                          {cookie.duration_human || cookie.duration}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{
                          padding: '0.375rem 0.875rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          border: '1px solid',
                          display: 'inline-block'
                        }} className={getTypeStyle(cookie.type)}>
                          {cookie.type}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: '#718096' }}>
                        {cookie.kb_source || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Results */}
        {results && results.length === 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <AlertCircle size={64} color="#cbd5e0" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#2d3748' }}>
              No Cookies Detected
            </h3>
            <p style={{ margin: 0, color: '#718096', fontSize: '1rem' }}>
              The website didn't set any cookies during the scan period.
            </p>
          </div>
        )}

        {/* Recent Jobs */}
        {jobs.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            marginTop: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>
              Recent Scans
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.background = '#f7fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = 'white';
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }} className={getStatusStyle(job.status)}>
                      {job.status === 'completed' ? (
                        <CheckCircle size={20} />
                      ) : job.status === 'failed' ? (
                        <AlertCircle size={20} />
                      ) : (
                        <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        color: '#2d3748',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {job.url}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    padding: '0.375rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    border: '1px solid'
                  }} className={getStatusStyle(job.status)}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CookieInventoryDashboard;
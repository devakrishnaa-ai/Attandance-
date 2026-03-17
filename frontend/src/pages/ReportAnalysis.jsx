import { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { FileText, Download, Calendar, Filter, Printer, BarChart3, ChevronDown, PieChart as PieIcon, Table as TableIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReportAnalysis = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // Default to YYYY-MM

    // Modal / Report States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reportType, setReportType] = useState('month'); // month, year
    const [reportData, setReportData] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'graph'

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const res = await api.get('batches/');
                setBatches(res.data);
            } catch {
                toast.error("Failed to load batches");
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        setReportData(null);
        try {
            const res = await api.get('attendance/report/', {
                params: {
                    type: reportType,
                    date: selectedDate,
                    batch_id: selectedBatch
                }
            });
            setReportData(res.data);
            toast.success("Report Generated");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to generate report");
        } finally {
            setGenerating(false);
        }
    };

    const downloadCSV = () => {
        if (!reportData) return;

        let headers = [];
        let rows = [];
        if (reportType === 'day') {
            filename = `report_${reportType}_${reportData.date}.csv`;
            headers = ['Student Name', 'Roll No', 'Status', 'Period', 'Subject'];
            rows = reportData.records.map(r => [
                r.student,
                r.roll,
                r.status,
                r.period,
                r.subject
            ]);
        } else {
            // Month/Year
            filename = `report_${reportType}_${selectedDate}.csv`;
            headers = ['Student Name', 'Roll No', 'Present', 'Absent', 'OD', 'Total Classes', 'Attendance %'];
            rows = reportData.stats.map(s => {
                const total = s.present + s.absent + s.od; // or s.total
                const percent = total > 0 ? Math.round(((s.present + s.od) / total) * 100) : 0;
                return [
                    s.student__name,
                    s.student__roll_number,
                    s.present,
                    s.absent,
                    s.od,
                    total,
                    `${percent}%`
                ];
            });
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(item => `"${item}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="text-blue-600" />
                        Report Analysis
                    </h1>
                    <p className="text-gray-500 mt-1">Generate and view detailed attendance analytics.</p>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Report Type</label>
                    <select
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={reportType}
                        onChange={e => setReportType(e.target.value)}
                    >
                        <option value="month">Month Analysis</option>
                        <option value="year">Yearly Analysis</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">
                        {reportType === 'month' ? 'Select Month' : 'Select Year (Date)'}
                    </label>
                    <input
                        type={reportType === 'month' ? 'month' : 'date'}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Batch (Optional)</label>
                    <select
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                    >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.year})</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {generating ? 'Processing...' : 'Generate Analysis'}
                    </button>
                </div>
            </div>

            {/* Results Area */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[400px]">
                {!reportData ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <BarChart3 size={64} className="mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-xl font-bold text-gray-500">No Report Generated</h3>
                        <p>Select criteria above and click "Generate Analysis"</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-bold dark:text-white">
                                    {reportType === 'day' ? `Report for ${reportData.date}` :
                                        reportType === 'month' ? `Analysis for ${reportData.month}` :
                                            `Yearly Analysis ${reportData.year}`}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Generated on {new Date().toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex gap-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition ${viewMode === 'table'
                                            ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <TableIcon size={16} /> Table
                                    </button>
                                    <button
                                        onClick={() => setViewMode('graph')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition ${viewMode === 'graph'
                                            ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <PieIcon size={16} /> Graphs
                                    </button>
                                </div>
                                <div className="w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold flex items-center gap-2 transition"
                                >
                                    <Printer size={16} /> Print
                                </button>
                                <button
                                    onClick={downloadCSV}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 transition shadow-lg shadow-green-500/20"
                                >
                                    <Download size={16} /> Export CSV
                                </button>
                            </div>
                        </div>

                        {viewMode === 'graph' && reportType !== 'day' && reportData.stats ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-fade-in">
                                {/* Overall Distribution */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-6 text-center">Overall Attendance Distribution</h4>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Present', value: reportData.graph_data?.distribution?.present || 0 },
                                                        { name: 'Absent', value: reportData.graph_data?.distribution?.absent || 0 },
                                                        { name: 'On Duty', value: reportData.graph_data?.distribution?.od || 0 },
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#16a34a" /> {/* Green */}
                                                    <Cell fill="#dc2626" /> {/* Red */}
                                                    <Cell fill="#ca8a04" /> {/* Yellow */}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Performance Distribution */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-6 text-center">Student Performance Groups</h4>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={reportData.graph_data?.performance || []}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className={viewMode === 'graph' ? 'hidden' : 'block overflow-x-auto border rounded-xl border-gray-200 dark:border-gray-700'}>

                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900 font-bold text-gray-600 dark:text-gray-300 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Student</th>
                                        <th className="px-4 py-3">Roll No</th>
                                        <th className="px-4 py-3 text-green-600">Present</th>
                                        <th className="px-4 py-3 text-red-600">Absent</th>
                                        <th className="px-4 py-3 text-yellow-600">OD</th>
                                        <th className="px-4 py-3">Total (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {reportData.stats.map((s, i) => {
                                        const total = s.present + s.absent + s.od;
                                        const percent = total > 0 ? Math.round(((s.present + s.od) / total) * 100) : 0;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3 font-medium dark:text-gray-200">{s.student__name}</td>
                                                <td className="px-4 py-3 text-gray-500 font-mono">{s.student__roll_number}</td>
                                                <td className="px-4 py-3 font-bold text-green-600">{s.present}</td>
                                                <td className="px-4 py-3 font-bold text-red-600">{s.absent}</td>
                                                <td className="px-4 py-3 font-bold text-yellow-600">{s.od}</td>
                                                <td className="px-4 py-3 font-bold">
                                                    {percent}% <span className="text-gray-400 font-normal text-xs">({total})</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {(reportType !== 'day' && reportData.stats.length === 0) && (
                                <div className="p-12 text-center text-gray-400">
                                    No data found for this selection.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default ReportAnalysis;

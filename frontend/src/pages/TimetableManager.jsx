import { useState, useEffect } from "react";
import api from "../api";
import { toast } from "react-hot-toast";
import { Calendar, Save, Trash2, Plus, Clock, User, BookOpen, Filter, Wand2 } from "lucide-react";

// Removed constant DEPARTMENTS

const SECTIONS = ['A', 'B', 'C'];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [
    { id: 1, time: "09:00 - 10:00" },
    { id: 2, time: "10:00 - 11:00" },
    { id: 3, time: "11:15 - 12:15" },
    { id: 4, time: "12:15 - 01:15" },
    { id: 5, time: "02:00 - 03:00" },
    { id: 6, time: "03:00 - 04:00" },
    { id: 7, time: "04:00 - 05:00" },
    { id: 8, time: "05:00 - 06:00" },
];

const TimetableManager = () => {
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [timetable, setTimetable] = useState([]); // All slots
    const [departments, setDepartments] = useState([]);
    const [modifications, setModifications] = useState([]); // Store sub/vacant records

    // Filters
    const [selectedDept, setSelectedDept] = useState("AI");
    const [selectedSection, setSelectedSection] = useState("A");

    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null); // { day, period }

    const [formData, setFormData] = useState({
        subject: "",
        faculty: ""
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [bRes, sRes, fRes, tRes, dRes] = await Promise.all([
                api.get('batches/'),
                api.get('subjects/'),
                api.get('faculty/'),
                api.get('timetable/'),
                api.get('departments/')
            ]);
            setBatches(bRes.data);
            setSubjects(sRes.data);
            setFaculty(fRes.data);
            setTimetable(tRes.data);
            setDepartments(dRes.data);

            // Load Mock Modifications
            const mods = JSON.parse(localStorage.getItem('mock_timetable_modifications') || '[]');
            setModifications(mods);
        } catch {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Get current Batch ID based on Dept/Section
    const currentBatch = batches.find(b => b.department === selectedDept && b.section === selectedSection);

    // Filter timetable for current view
    const currentSlots = timetable.filter(t => t.batch === currentBatch?.id);

    const handleCellClick = (day, period) => {
        if (!currentBatch) {
            toast.error("Please select a valid class first");
            return;
        }

        // Check if slot exists (regular or modified)
        const regularSlot = currentSlots.find(t => t.day === day && t.period === period);
        // Find if any modification overrides this slot (matching original slot id or day/period/batch)
        const activeMod = modifications.find(m =>
            (m.original_slot_id === regularSlot?.id) ||
            (m.day === day && m.period === period && m.batch === currentBatch.id)
        );

        const isVacant = activeMod?.status === 'vacant';
        const isSubstituted = activeMod?.new_faculty_id;

        setSelectedSlot({
            day,
            period,
            id: regularSlot?.id,
            modId: activeMod?.id, // Mock ID concept
            isVacant: isVacant,
            isSubstituted: isSubstituted
        });

        // If vacant/subbed, form should handle 'substitution' mode
        setFormData({
            subject: regularSlot?.subject || "",
            // If vacant, clear faculty so user must pick one. If substituted, show the sub. Else show original.
            faculty: isVacant ? "" : (activeMod?.new_faculty_id || regularSlot?.faculty || ""),
            isSubstitutionMode: isVacant || isSubstituted
        });
        setModalOpen(true);
        setErrors({}); // Clear errors
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.subject) newErrors.subject = "Subject is required";
        if (!formData.faculty) newErrors.faculty = "Faculty is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedSlot || !currentBatch) return;
        if (!validateForm()) return;

        try {
            const payload = {
                batch: currentBatch.id,
                day: selectedSlot.day,
                period: selectedSlot.period,
                subject: formData.subject,
                faculty: formData.faculty
            };

            if (formData.isSubstitutionMode) {
                // Handle Substitution
                const existingMods = JSON.parse(localStorage.getItem('mock_timetable_modifications') || '[]');

                // Update the specific mod record
                const updatedMods = existingMods.map(m => {
                    // Match by slot details
                    if (m.day === selectedSlot.day && m.period === selectedSlot.period && m.batch === currentBatch.id) {
                        return { ...m, status: 'substituted', new_faculty_id: formData.faculty };
                    }
                    return m;
                });

                localStorage.setItem('mock_timetable_modifications', JSON.stringify(updatedMods));
                setModifications(updatedMods);
                toast.success("Faculty Replaced Successfully");

            } else if (selectedSlot.id) {
                await api.put(`timetable/${selectedSlot.id}/`, payload);
                toast.success("Updated");
            } else {
                await api.post('timetable/', payload);
                toast.success("Scheduled");
            }

            // Refresh
            const res = await api.get('timetable/');
            setTimetable(res.data);
            setModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to schedule");
        }
    };

    const handleDelete = async () => {
        if (!selectedSlot?.id) return;
        if (!confirm("Clear this slot?")) return;
        try {
            await api.delete(`timetable/${selectedSlot.id}/`);
            toast.success("Cleared");
            const res = await api.get('timetable/');
            setTimetable(res.data);
            setModalOpen(false);
        } catch {
            toast.error("Failed to delete");
        }
    };

    const handleAutoSuggest = () => {
        // Find first available faculty not busy
        const availableFaculty = faculty.find(f => {
            const isBusy = timetable.some(t =>
                t.faculty === f.id &&
                t.day === selectedSlot.day &&
                t.period === selectedSlot.period
            );
            return !isBusy;
        });

        if (availableFaculty) {
            setFormData({ ...formData, faculty: availableFaculty.id });
            toast.success(`Found Substitute: ${availableFaculty.full_name || availableFaculty.username}`);
        } else {
            toast.error("No free faculty found for this slot");
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="space-y-6 p-4 max-w-[1600px] mx-auto">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Calendar className="text-blue-600 w-8 h-8" />
                        Timetable Manager
                    </h1>
                    <p className="text-gray-500 mt-1">Manage weekly class schedules efficiently.</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                        <BookOpen size={14} /> Batch Occupancy: {currentSlots.length} / {DAYS.length * PERIODS.length}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border dark:border-gray-700">
                    <div className="flex items-center gap-2 px-3 py-2 text-gray-500 font-medium">
                        <Filter size={18} /> Filters
                    </div>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

                    <select
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedDept}
                        onChange={e => {
                            setSelectedDept(e.target.value);
                            // Auto-select first available section for new dept
                            const deptBatches = batches.filter(b => b.department === e.target.value);
                            const sections = [...new Set(deptBatches.map(b => b.section))].sort();
                            if (sections.length > 0 && !sections.includes(selectedSection)) {
                                setSelectedSection(sections[0]);
                            }
                        }}
                    >
                        {departments.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                    </select>

                    <select
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none w-24"
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                    >
                        {(() => {
                            // Derive sections dynamically from batches for selected Dept
                            const deptBatches = batches.filter(b => b.department === selectedDept);
                            const availableSections = [...new Set(deptBatches.map(b => b.section))].sort();

                            // Fallback if no batches found (e.g. data loading or empty dept)
                            const displaySections = availableSections.length > 0 ? availableSections : ['A'];

                            return displaySections.map(s => <option key={s} value={s}>Sec {s}</option>);
                        })()}
                    </select>
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[1000px]">
                        {/* Header Row */}
                        <div className="grid grid-cols-[100px_repeat(8,1fr)] bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700">
                            <div className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider flex items-center justify-center">Day</div>
                            {PERIODS.map(p => (
                                <div key={p.id} className="p-3 text-center border-l border-gray-100 dark:border-gray-700">
                                    <div className="font-black text-gray-700 dark:text-gray-300 text-sm">PERIOD {p.id}</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-1">{p.time}</div>
                                </div>
                            ))}
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {DAYS.map(day => (
                                <div key={day} className="grid grid-cols-[100px_repeat(8,1fr)] group hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                    {/* Day Cell */}
                                    <div className="py-4 px-2 font-bold text-gray-700 dark:text-gray-300 flex flex-col items-center justify-center border-r dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm rotate-180 md:rotate-0 writing-mode-vertical md:writing-mode-horizontal">
                                        <span>{day.substring(0, 3).toUpperCase()}</span>
                                        <span className="text-[10px] text-gray-400 mt-1 font-mono">
                                            {currentSlots.filter(t => t.day === day).length}/8
                                        </span>
                                    </div>

                                    {/* Period Cells */}
                                    {PERIODS.map(p => {
                                        const slot = currentSlots.find(t => t.day === day && t.period === p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => handleCellClick(day, p.id)}
                                                className="p-2 border-l border-gray-100 dark:border-gray-700 h-28 relative transition-all"
                                            >
                                                {/* Logic to determine if vacant or substituted */}
                                                {(() => {
                                                    const slot = currentSlots.find(t => t.day === day && t.period === p.id);
                                                    const activeMod = modifications.find(m =>
                                                        (m.original_slot_id === slot?.id) ||
                                                        (m.day === day && m.period === p.id && m.batch === currentBatch?.id)
                                                    );

                                                    const isVacant = activeMod?.status === 'vacant';
                                                    const isSubstituted = activeMod?.status === 'substituted';

                                                    // Display Logic
                                                    if (isVacant) {
                                                        return (
                                                            <div className="h-full w-full rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-dashed border-red-200 dark:border-red-800 p-3 cursor-pointer hover:shadow-md transition-all group/card flex flex-col justify-center items-center text-center">
                                                                <div className="font-black text-red-500 text-xs uppercase tracking-wider mb-1">ABSENT</div>
                                                                <div className="text-[10px] text-red-400 font-bold">Reschedule</div>
                                                                <div className="mt-2 text-[10px] bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 px-2 py-0.5 rounded-full font-bold">Vacant</div>
                                                            </div>
                                                        );
                                                    }

                                                    if (isSubstituted) {
                                                        // Find replacement faculty name
                                                        const replacement = faculty.find(f => f.id == activeMod.new_faculty_id);
                                                        return (
                                                            <div className="h-full w-full rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 cursor-pointer hover:shadow-md transition-all group/card flex flex-col justify-between">
                                                                <div>
                                                                    <div className="font-bold text-amber-800 dark:text-amber-300 text-xs mb-1 line-clamp-2 leading-tight">
                                                                        {slot?.subject_name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400/80 mt-1">
                                                                        <User size={12} className="shrink-0" />
                                                                        <span className="truncate">{replacement?.full_name || "Substitute"}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wide text-right">
                                                                    Substituted
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (slot) {
                                                        return (
                                                            <div className="h-full w-full rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group/card flex flex-col justify-between">
                                                                <div>
                                                                    <div className="font-bold text-blue-800 dark:text-blue-300 text-xs mb-1 line-clamp-2 leading-tight">
                                                                        {slot.subject_name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400/80 mt-1">
                                                                        <User size={12} className="shrink-0" />
                                                                        <span className="truncate">{slot.faculty_name?.split(' ')[0]}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-[10px] text-blue-400 font-mono text-right opacity-50">
                                                                    P{p.id}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="h-full w-full rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:border-blue-200 hover:bg-blue-50/50 dark:hover:bg-gray-700 hover:text-blue-400 cursor-pointer transition-all">
                                                            <Plus size={20} />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl scale-100 transform transition-all">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    <Clock size={18} className="text-blue-500" />
                                    Edit Schedule
                                </h3>
                                <p className="text-xs text-gray-500">{selectedSlot?.day} • Period {selectedSlot?.period}</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <Clock size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 ml-1">Subject</label>
                                <select
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                    disabled={formData.isSubstitutionMode} // Subject cannot be changed during substitution, only faculty
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 ml-1">Faculty</label>
                                <select
                                    className={`w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium ${errors.faculty ? 'border-red-500' : ''}`}
                                    value={formData.faculty}
                                    onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                                    required
                                >
                                    <option value="">Select Faculty</option>
                                    {faculty.map(f => {
                                        // Specific Logic: Is this faculty busy?
                                        // Check if they have a slot on THIS day & period in ANY batch
                                        // But EXCLUDE the current slot we are editing (if any)
                                        const isBusy = timetable.some(t =>
                                            t.faculty === f.id &&
                                            t.day === selectedSlot.day &&
                                            t.period === selectedSlot.period &&
                                            t.id !== selectedSlot.id // Important: Don't count self
                                        );

                                        if (isBusy) return null; // Don't show busy faculty

                                        return (
                                            <option key={f.id} value={f.id}>
                                                {f.full_name || f.username}
                                            </option>
                                        );
                                    })}
                                </select>
                                {errors.faculty && <p className="text-red-500 text-xs mt-1">{errors.faculty}</p>}
                                <button
                                    type="button"
                                    onClick={handleAutoSuggest}
                                    className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg w-full flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Wand2 size={14} /> Suggest Available Faculty
                                </button>
                            </div>

                            <div className="flex gap-3 pt-4">
                                {selectedSlot.id && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="p-3.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button className="flex-1 p-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                                    {formData.isSubstitutionMode ? 'Confirm Replacement' : 'Save Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetableManager;

import { useState, useContext } from 'react';
import { toast } from 'react-hot-toast';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, ArrowRight, LayoutDashboard } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            toast.error("Please enter both username and password");
            return;
        }

        setIsLoading(true);

        // Artificial delay for better UX feel
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));

        try {
            const response = await login(username, password);
            await minLoadTime;

            toast.success("Welcome back!");

            if (response.is_staff || response.is_superuser || response.role === 'admin' || response.role === 'hod') {
                navigate('/');
            } else if (response.role === 'faculty') {
                navigate('/faculty-dashboard');
            } else {
                navigate('/student-dashboard');
            }
        } catch (err) {
            await minLoadTime;
            const errorMsg = err.response?.data?.detail || "Invalid username or password";
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* LEFT SIDE - VISUALS (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-900 relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                        <LayoutDashboard size={32} className="text-white" />
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight">
                        Manage Your <span className="text-blue-400">Attendance</span> Efficiently.
                    </h1>
                    <p className="text-lg text-blue-100/80 leading-relaxed">
                        Track your academic progress, view attendance reports, and manage your student profile all in one place.
                    </p>
                </div>

                {/* Decorative Circles */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/30 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px]"></div>
            </div>

            {/* RIGHT SIDE - FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-lg border border-gray-100 lg:shadow-none lg:border-none">

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-gray-500">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-gray-800 placeholder-gray-400"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-gray-800 placeholder-gray-400"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-6 transform active:scale-[0.98]
                                ${isLoading
                                    ? 'bg-indigo-400 cursor-wait'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/30'}
                            `}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    Sign In <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>


                </div>
            </div>
        </div>
    );
};

export default Login;

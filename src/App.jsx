import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Flame, 
  Calendar, 
  Clock, 
  BookOpen, 
  LogOut, 
  User, 
  Plus, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  Medal, 
  CheckCircle2, 
  Lock,
  Mail,
  Sun,
  Moon,
  Info,
  Users
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDud0gZTK0GbqfmJZffx5YHG92-wWWZYAo",
      authDomain: "pdmprayermillagetracker.firebaseapp.com",
      projectId: "pdmprayermillagetracker",
      storageBucket: "pdmprayermillagetracker.firebasestorage.app",
      messagingSenderId: "159381550823",
      appId: "1:159381550823:web:dc594ee0237dafa37f9442",
      measurementId: "G-R66H3MBKEN"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pdm-prayer-mileage-tracker';

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Main UI State
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [leaderboardTab, setLeaderboardTab] = useState('alltime');

  // Logging Form State (Custom Hours & Minutes)
  const [logHours, setLogHours] = useState(1);
  const [logMinutes, setLogMinutes] = useState(0);
  const [prayerCategory, setPrayerCategory] = useState('Personal Prayer');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [reflection, setReflection] = useState('');
  const [logSuccess, setLogSuccess] = useState('');
  const [logError, setLogError] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Firestore Data State
  const [userLogs, setUserLogs] = useState([]);
  const [communityLogs, setCommunityLogs] = useState([]);

  // 1. Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (err) {
        console.warn("Auth token fallback:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch User Logs & Public Community Logs from Firestore
  useEffect(() => {
    if (!user) return;

    const publicRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayerLogs');
    const unsubPublic = onSnapshot(
      publicRef,
      (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        logs.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        setCommunityLogs(logs);
      },
      (err) => console.error("Error fetching community logs:", err)
    );

    const privateRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prayerLogs');
    const unsubPrivate = onSnapshot(
      privateRef,
      (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setUserLogs(logs);
      },
      (err) => console.error("Error fetching user logs:", err)
    );

    return () => {
      unsubPublic();
      unsubPrivate();
    };
  }, [user]);

  // Auth Functions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setAuthError('Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters');
        return;
      }
      try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: fullName });
        setUser({ ...res.user, displayName: fullName });
      } catch (err) {
        setAuthError(err.message.replace('Firebase:', '').trim());
      }
    } else if (authMode === 'login') {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setAuthError('Invalid email or password credential.');
      }
    }
  };

  // Password Reset Handler
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!email.trim()) {
      setAuthError('Please enter your email address to reset your password.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAuthSuccess('Password reset link sent! Please check your email inbox (and spam folder).');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setAuthError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  // Prayer Log Submission (Exact Hours & Minutes computation)
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setLogError('');
    setLogSuccess('');

    const hrs = parseInt(logHours, 10) || 0;
    const mins = parseInt(logMinutes, 10) || 0;
    const totalHours = hrs + (mins / 60);

    if (totalHours < 0.5) {
      setLogError('Minimum prayer time required is 30 minutes (0.5 hours).');
      return;
    }
    if (totalHours > 3.0) {
      setLogError('Maximum allowed single entry is 3 hours.');
      return;
    }

    setIsSubmittingLog(true);

    try {
      const displayName = user?.displayName || user?.email?.split('@')[0] || 'Prayer Warrior';
      const newEntry = {
        userId: user.uid,
        userName: displayName,
        duration: Number(totalHours.toFixed(2)),
        displayDuration: `${hrs}h ${mins}m`,
        category: prayerCategory,
        date: logDate,
        reflection: reflection.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'prayerLogs'), newEntry);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'prayerLogs'), newEntry);

      setLogSuccess(`Successfully recorded ${hrs}h ${mins}m of prayer!`);
      setReflection('');
      setLogHours(1);
      setLogMinutes(0);
      setPrayerCategory('Personal Prayer');

      setTimeout(() => {
        setLogSuccess('');
        setActiveTab('dashboard');
      }, 1500);

    } catch (err) {
      setLogError('Failed to record prayer session. Please try again.');
      console.error(err);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Calculations: User Personal Totals
  const userStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    let todayHours = 0;
    let weekHours = 0;
    let total30DayHours = 0;

    userLogs.forEach(log => {
      const logDateObj = new Date(log.date);
      const hrs = Number(log.duration) || 0;

      if (log.date === todayStr) {
        todayHours += hrs;
      }
      if (logDateObj >= startOfWeek) {
        weekHours += hrs;
      }
      if (logDateObj >= thirtyDaysAgo) {
        total30DayHours += hrs;
      }
    });

    const goal30Day = 60;
    const progressPercent = Math.min(100, Math.round((total30DayHours / goal30Day) * 100));

    return {
      todayHours,
      weekHours,
      total30DayHours,
      goal30Day,
      progressPercent,
      totalEntries: userLogs.length
    };
  }, [userLogs]);

  // Aggregate Leaderboards
  const leaderboards = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const mapAllTime = {};
    const mapDaily = {};
    const mapWeekly = {};
    const map30Days = {};

    communityLogs.forEach(log => {
      const logDateObj = new Date(log.date);
      const hrs = Number(log.duration) || 0;
      const uid = log.userId || 'anon';
      const uName = log.userName || 'Prayer Warrior';

      if (!mapAllTime[uid]) mapAllTime[uid] = { id: uid, name: uName, hours: 0, avatar: '🔥' };
      mapAllTime[uid].hours += hrs;

      if (log.date === todayStr) {
        if (!mapDaily[uid]) mapDaily[uid] = { id: uid, name: uName, hours: 0, avatar: '🔥' };
        mapDaily[uid].hours += hrs;
      }

      if (logDateObj >= startOfWeek) {
        if (!mapWeekly[uid]) mapWeekly[uid] = { id: uid, name: uName, hours: 0, avatar: '🔥' };
        mapWeekly[uid].hours += hrs;
      }

      if (logDateObj >= thirtyDaysAgo) {
        if (!map30Days[uid]) map30Days[uid] = { id: uid, name: uName, hours: 0, avatar: '🔥' };
        map30Days[uid].hours += hrs;
      }
    });

    return {
      alltime: Object.values(mapAllTime).sort((a, b) => b.hours - a.hours).slice(0, 10),
      daily: Object.values(mapDaily).sort((a, b) => b.hours - a.hours).slice(0, 10),
      weekly: Object.values(mapWeekly).sort((a, b) => b.hours - a.hours).slice(0, 10),
      '30days': Object.values(map30Days).sort((a, b) => b.hours - a.hours).slice(0, 10),
    };
  }, [communityLogs]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Sparkles className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Entering Prayer Sanctuary...</p>
      </div>
    );
  }

  // --- UNAUTHENTICATED VIEW ---
  if (!user) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className="w-full max-w-md">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-4">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-amber-400 to-purple-400 bg-clip-text text-transparent">
              PDM Prayer Mileage Tracker
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Track your devotion, build prayer endurance, and compete with believers worldwide.
            </p>
          </div>

          <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-purple-950/40' : 'bg-white border-slate-200 shadow-xl'}`}>
            
            <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'login' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'signup' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {authMode === 'forgot' ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-xs text-slate-400 mb-2">
                  Enter your registered email address below and we will send you a password reset link.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="devotee@sanctuary.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
                >
                  {isSendingReset ? 'Sending Reset Email...' : 'Send Reset Email'}
                </button>

                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sister Grace Ogundipe"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="devotee@sanctuary.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-400">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition active:scale-[0.98]"
                >
                  {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>
            )}
          </div>
          
          <div className="mt-6 text-center text-xs text-slate-500">
            Daily logs: min 30 minutes (0.5 hrs) • max 3 hours per entry.
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED MAIN APPLICATION ---
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-300 pb-16`}>
      
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 border-b ${darkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md' : 'bg-white/80 border-slate-200 backdrop-blur-md'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                PDM Prayer Mileage Tracker
              </h1>
              <p className="text-[11px] text-slate-400">30-Day Spiritual Endurance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition ${darkMode ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 hover:bg-slate-200'}`}
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold max-w-[120px] truncate">
                {user.displayName || 'Devotee'}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : darkMode ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'}`}
          >
            <Trophy className="w-4 h-4" />
            Leaderboards & Dashboard
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'log' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : darkMode ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'}`}
          >
            <Plus className="w-4 h-4" />
            Log Prayer Hours
          </button>

          <button
            onClick={() => setActiveTab('challenge')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'challenge' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : darkMode ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'}`}
          >
            <TrendingUp className="w-4 h-4" />
            30-Day Mileage Status
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'history' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : darkMode ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'}`}
          >
            <Clock className="w-4 h-4" />
            My Prayer Logs ({userStats.totalEntries})
          </button>
        </div>

        {/* --- VIEW 1: DASHBOARD & LEADERBOARDS --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      Top 10 Prayer Warriors
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Recognizing dedicated prayer mileage rankings across all members.
                    </p>
                  </div>

                  <div className="flex bg-slate-800/60 p-1 rounded-xl self-start sm:self-auto border border-slate-700/50 flex-wrap gap-1">
                    <button
                      onClick={() => setLeaderboardTab('alltime')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${leaderboardTab === 'alltime' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      All Total
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('daily')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${leaderboardTab === 'daily' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('weekly')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${leaderboardTab === 'weekly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('30days')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${leaderboardTab === '30days' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      30-Day
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {leaderboards[leaderboardTab].length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No active records found for this period yet. Switch to "All Total" to view total member mileage!
                    </div>
                  ) : (
                    leaderboards[leaderboardTab].map((item, index) => {
                      const rank = index + 1;
                      const isCurrentUser = item.id === user.uid;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                            isCurrentUser
                              ? 'bg-amber-500/10 border-amber-500/40'
                              : rank === 1 
                              ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30' 
                              : rank === 2 
                              ? 'bg-slate-800/40 border-slate-700/40' 
                              : rank === 3 
                              ? 'bg-amber-900/10 border-amber-800/20' 
                              : darkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                              {rank === 1 && <Medal className="w-6 h-6 text-amber-400" />}
                              {rank === 2 && <Medal className="w-6 h-6 text-slate-300" />}
                              {rank === 3 && <Medal className="w-6 h-6 text-amber-700" />}
                              {rank > 3 && <span className="text-slate-400">#{rank}</span>}
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{item.avatar}</span>
                              <div>
                                <span className="text-sm font-semibold block leading-tight flex items-center gap-1.5">
                                  {item.name}
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">You</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {leaderboardTab === 'alltime' ? 'All-Time Total' : leaderboardTab === 'daily' ? 'Today' : leaderboardTab === 'weekly' ? 'This Week' : '30-Day Cumulative'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-amber-400">
                              {item.hours.toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-purple-400" />
                  Live Community Activity Feed
                </h3>

                {communityLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No community logs recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {communityLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition ${
                          log.userId === user.uid
                            ? 'bg-amber-500/5 border-amber-500/20'
                            : darkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">{log.userName || 'Devotee'}</span>
                              {log.category && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  {log.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 italic">
                              "{log.reflection || 'Logged prayer session'}"
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-amber-400">{log.displayDuration || `${log.duration} hrs`}</span>
                          <span className="block text-[10px] text-slate-500">{log.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="space-y-6">
              
              <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Your Devotion Today
                </h3>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-extrabold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                    {userStats.todayHours.toFixed(1)}
                  </span>
                  <span className="text-sm text-slate-400 font-semibold">/ 3.0 max hrs</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-4">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (userStats.todayHours / 3.0) * 100)}%` }}
                  ></div>
                </div>

                <button
                  onClick={() => setActiveTab('log')}
                  className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  Log Today's Prayer Session
                </button>
              </div>

              <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Weekly Mileage
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-purple-400">
                    {userStats.weekHours.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">hours accumulated</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} text-xs space-y-2`}>
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Mileage Validation Guidelines
                </div>
                <p>• Minimum entry: <strong>30 minutes (0.5 hrs)</strong></p>
                <p>• Maximum entry: <strong>3 hours (3.0 hrs)</strong> per log</p>
                <p>• Custom hours and minutes inputs supported.</p>
              </div>

            </div>

          </div>
        )}

        {/* --- VIEW 2: PRAYER HOURS LOGGING FORM (CUSTOM HOURS & MINUTES) --- */}
        {activeTab === 'log' && (
          <div className="max-w-xl mx-auto">
            <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md'}`}>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Record Prayer Mileage</h2>
                  <p className="text-xs text-slate-400">Specify your exact hours and minutes of devotion.</p>
                </div>
              </div>

              {logError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{logError}</span>
                </div>
              )}

              {logSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{logSuccess}</span>
                </div>
              )}

              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Prayer Duration (Exact Time)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">Hours (0 - 3)</span>
                      <input
                        type="number"
                        min="0"
                        max="3"
                        value={logHours}
                        onChange={(e) => setLogHours(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm outline-none transition"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">Minutes (0 - 59)</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={logMinutes}
                        onChange={(e) => setLogMinutes(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm outline-none transition"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    Total: {logHours} hr(s) {logMinutes} min(s)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Prayer Category</label>
                  <select
                    value={prayerCategory}
                    onChange={(e) => setPrayerCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm outline-none transition"
                  >
                    <option value="Revival & spiritual Awakening">Revival & spiritual Awakening</option>
                    <option value="Healing & Deliverance">Healing & Deliverance</option>
                    <option value="Families">Families</option>
                    <option value="Personal Prayer">Personal Prayer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Reflection / Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What scriptures or burdens did you carry in prayer today?"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm outline-none transition resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
                >
                  {isSubmittingLog ? 'Recording Mileage...' : 'Submit Prayer Hours'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- VIEW 3: 30-DAY MILEAGE CHALLENGE STATUS --- */}
        {activeTab === 'challenge' && (
          <div className={`max-w-xl mx-auto p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">30-Day Spiritual Endurance</h2>
                <p className="text-xs text-slate-400">Your cumulative progress toward the 60-hour goal.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="flex justify-between text-sm mb-2 font-semibold">
                  <span>Total Accumulated</span>
                  <span className="text-amber-400">{userStats.total30DayHours.toFixed(1)} / {userStats.goal30Day} hrs</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${userStats.progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-right">{userStats.progressPercent}% of target achieved</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center">
                  <span className="block text-2xl font-bold text-amber-400">{userStats.totalEntries}</span>
                  <span className="text-xs text-slate-400">Total Sessions Logged</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center">
                  <span className="block text-2xl font-bold text-purple-400">{(userStats.total30DayHours / (userStats.totalEntries || 1)).toFixed(1)} hrs</span>
                  <span className="text-xs text-slate-400">Avg. Per Session</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 4: MY PRAYER LOG HISTORY --- */}
        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Your Prayer Log History
              </h2>
              <span className="text-xs text-slate-400">{userLogs.length} total records</span>
            </div>

            {userLogs.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">No prayer sessions logged yet.</p>
                <p className="text-xs text-slate-500 mt-1">Click "Log Prayer Hours" above to record your first session.</p>
              </div>
            ) : (
              userLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      {log.displayDuration || `${log.duration}h`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400">{log.date}</span>
                        {log.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                            {log.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 mt-1 italic">
                        "{log.reflection || 'No reflection provided.'}"
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500 shrink-0 self-end sm:self-center">
                    {new Date(log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  );
}
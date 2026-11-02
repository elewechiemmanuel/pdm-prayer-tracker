import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Flame, 
  Award, 
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
  ChevronRight,
  BarChart2,
  Lock,
  Mail,
  Sun,
  Moon,
  Info
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

// Mock baseline data for vibrant community leaderboards
const INITIAL_MOCK_LEADERBOARD = [
  { id: 'm1', name: 'Sister Grace O.', hoursToday: 3.0, hoursWeek: 18.5, total30Days: 72.0, avatar: '✨' },
  { id: 'm2', name: 'Pastor David K.', hoursToday: 2.5, hoursWeek: 16.0, total30Days: 68.5, avatar: '🕊️' },
  { id: 'm3', name: 'Hannah M.', hoursToday: 2.5, hoursWeek: 15.0, total30Days: 61.0, avatar: '⭐' },
  { id: 'm4', name: 'Brother Emmanuel', hoursToday: 2.0, hoursWeek: 14.0, total30Days: 58.0, avatar: '🔥' },
  { id: 'm5', name: 'Samuel B.', hoursToday: 2.0, hoursWeek: 13.5, total30Days: 54.0, avatar: '🙏' },
  { id: 'm6', name: 'Rachel T.', hoursToday: 1.5, hoursWeek: 11.5, total30Days: 49.0, avatar: '🌸' },
  { id: 'm7', name: 'Joshua N.', hoursToday: 1.5, hoursWeek: 10.0, total30Days: 45.0, avatar: '⚡' },
  { id: 'm8', name: 'Esther P.', hoursToday: 1.0, hoursWeek: 9.5, total30Days: 41.5, avatar: '👑' },
  { id: 'm9', name: 'Michael C.', hoursToday: 1.0, hoursWeek: 8.0, total30Days: 38.0, avatar: '🛡️' },
  { id: 'm10', name: 'Deborah A.', hoursToday: 0.5, hoursWeek: 7.0, total30Days: 32.0, avatar: '🌿' },
];

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  // Main UI State
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'log' | 'history' | 'challenge'
  const [leaderboardTab, setLeaderboardTab] = useState('daily'); // 'daily' | 'weekly'

  // Logging Form State (Validation: Min 0.5hr / 30 mins, Max 3.0hrs)
  const [durationHours, setDurationHours] = useState(1.0); // decimal representation
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
        console.warn("Auth token fallback to anonymous/custom:", err);
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

    // Fetch public prayer records for global leaderboard calculations
    const publicRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayerLogs');
    const unsubPublic = onSnapshot(
      publicRef,
      (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        setCommunityLogs(logs);
      },
      (err) => console.error("Error fetching community logs:", err)
    );

    // Fetch user specific prayer records
    const privateRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prayerLogs');
    const unsubPrivate = onSnapshot(
      privateRef,
      (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        // Sort newest first
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
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setAuthError('Invalid email or password credential.');
      }
    }
  };

  const handleDemoSignIn = async () => {
    try {
      await signInAnonymously(auth);
      if (auth.currentUser && !auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: 'Grace Walker' });
      }
    } catch (err) {
      setAuthError('Could not sign in anonymously');
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  // Prayer Log Submission (Min 0.5 hrs, Max 3 hrs)
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setLogError('');
    setLogSuccess('');

    // Validation
    const hrs = parseFloat(durationHours);
    if (isNaN(hrs) || hrs < 0.5) {
      setLogError('Minimum prayer time required is 30 minutes (0.5 hours).');
      return;
    }
    if (hrs > 3.0) {
      setLogError('Maximum allowed single entry is 3 hours.');
      return;
    }

    setIsSubmittingLog(true);

    try {
      const displayName = user?.displayName || user?.email?.split('@')[0] || 'Prayer Warrior';
      const newEntry = {
        userId: user.uid,
        userName: displayName,
        duration: hrs,
        date: logDate,
        reflection: reflection.trim(),
        createdAt: new Date().toISOString()
      };

      // 1. Save to user private collection
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'prayerLogs'), newEntry);

      // 2. Save to public collection for leaderboards
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'prayerLogs'), newEntry);

      setLogSuccess(`Successfully recorded ${hrs} hour(s) of prayer!`);
      setReflection('');
      setDurationHours(1.0);

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

  // Calculations: User Totals & Leaderboards
  const userStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Start of current week (Sunday or Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 30 Days Ago
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

    // 30-day Goal Target (e.g. 60 Hours goal = 2 hours daily average)
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

  // Aggregate Leaderboards combining Mock + Firebase Realtime User Data
  const leaderboards = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const mapUserDaily = {};
    const mapUserWeekly = {};

    // 1. Seed with mock items
    INITIAL_MOCK_LEADERBOARD.forEach(m => {
      mapUserDaily[m.id] = { id: m.id, name: m.name, hours: m.hoursToday, avatar: m.avatar };
      mapUserWeekly[m.id] = { id: m.id, name: m.name, hours: m.hoursWeek, avatar: m.avatar };
    });

    // 2. Add realtime data from Firestore
    communityLogs.forEach(log => {
      const logDateObj = new Date(log.date);
      const hrs = Number(log.duration) || 0;
      const uid = log.userId || 'anon';
      const uName = log.userName || 'Believer';

      if (log.date === todayStr) {
        if (!mapUserDaily[uid]) {
          mapUserDaily[uid] = { id: uid, name: uName, hours: 0, avatar: '🔥' };
        }
        mapUserDaily[uid].hours += hrs;
      }

      if (logDateObj >= startOfWeek) {
        if (!mapUserWeekly[uid]) {
          mapUserWeekly[uid] = { id: uid, name: uName, hours: 0, avatar: '🔥' };
        }
        mapUserWeekly[uid].hours += hrs;
      }
    });

    const dailySorted = Object.values(mapUserDaily)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    const weeklySorted = Object.values(mapUserWeekly)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    return {
      daily: dailySorted,
      weekly: weeklySorted
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
          
          {/* Header Branding */}
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

          {/* Auth Card */}
          <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-purple-950/40' : 'bg-white border-slate-200 shadow-xl'}`}>
            
            {/* Toggle Tabs */}
            <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'login' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
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

            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <button
                onClick={handleDemoSignIn}
                className="text-xs text-amber-400/80 hover:text-amber-400 underline transition"
              >
                Quick Demo Sign In (Skip Registration)
              </button>
            </div>
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

          {/* User Profile & Actions */}
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
            
            {/* Column 1: Leaderboard (Spans 2 cols) */}
            <div className={`lg:col-span-2 p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Top 10 Prayer Warriors
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Recognizing dedicated prayer mileage for believers.
                  </p>
                </div>

                {/* Sub-tab: Daily vs Weekly */}
                <div className="flex bg-slate-800/60 p-1 rounded-xl self-start sm:self-auto border border-slate-700/50">
                  <button
                    onClick={() => setLeaderboardTab('daily')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${leaderboardTab === 'daily' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Daily Top 10
                  </button>
                  <button
                    onClick={() => setLeaderboardTab('weekly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${leaderboardTab === 'weekly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Weekly Top 10
                  </button>
                </div>
              </div>

              {/* Leaderboard List */}
              <div className="space-y-3">
                {leaderboards[leaderboardTab].map((item, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                        rank === 1 
                          ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30' 
                          : rank === 2 
                          ? 'bg-slate-800/40 border-slate-700/40' 
                          : rank === 3 
                          ? 'bg-amber-900/10 border-amber-800/20' 
                          : darkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                          {rank === 1 && <Medal className="w-6 h-6 text-amber-400" />}
                          {rank === 2 && <Medal className="w-6 h-6 text-slate-300" />}
                          {rank === 3 && <Medal className="w-6 h-6 text-amber-700" />}
                          {rank > 3 && <span className="text-slate-400">#{rank}</span>}
                        </div>

                        {/* User Avatar & Name */}
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{typeof item.avatar === 'string' ? item.avatar : '🙏'}</span>
                        <div>
                          <span className="text-sm font-semibold block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {leaderboardTab === 'daily' ? 'Today' : 'This Week'}
                          </span>
                        </div>
                      </div>

                      {/* Prayer Hours Metric */}
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-amber-400">
                          {item.hours.toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Column 2: Personal Quick Snapshot */}
            <div className="space-y-6">
              
              {/* Daily Status Card */}
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

              {/* Weekly Status Card */}
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

              {/* Rules Reminder Card */}
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} text-xs space-y-2`}>
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Mileage Validation Guidelines
                </div>
                <p>• Minimum entry: <strong>30 minutes (0.5 hrs)</strong></p>
                <p>• Maximum entry: <strong>3 hours (3.0 hrs)</strong> per log</p>
                <p>• Leaderboards update automatically upon daily/weekly log submissions.</p>
              </div>

            </div>

          </div>
        )}

        {/* --- VIEW 2: PRAYER HOURS LOGGING FORM --- */}
        {activeTab === 'log' && (
          <div className="max-w-xl mx-auto">
            <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md'}`}>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Record Prayer Mileage</h2>
                  <p className="text-xs text-slate-400">Log your devoted hours for today or a past date.</p>
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

              <form onSubmit={handleLogSubmit} className="space-y-6">
                
                {/* Date Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Date of Devotion</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm outline-none focus:border-amber-500 transition"
                  />
                </div>

                {/* Duration Slider & Selector (0.5 hrs to 3.0 hrs) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-400">Duration Covered</label>
                    <span className="text-base font-extrabold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                      {parseFloat(durationHours).toFixed(1)} Hours ({Math.round(parseFloat(durationHours) * 60)} Mins)
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.5"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer my-3"
                  />

                  {/* Preset Quick Buttons */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[0.5, 1.0, 2.0, 3.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDurationHours(preset)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          parseFloat(durationHours) === preset
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {preset === 0.5 ? '30 mins' : `${preset} hrs`}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    * Enforced rule: Min 0.5 hrs (30m) • Max 3 hrs per entry.
                  </p>
                </div>

                {/* Reflection Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Reflection / Prayer Notes (Optional)</label>
                  <textarea
                    rows="3"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Focus areas: Intercession, Worship, Scriptures read..."
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm outline-none focus:border-amber-500 transition resize-none"
                  ></textarea>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmittingLog ? 'Recording Entry...' : 'Submit Prayer Mileage'}
                </button>

              </form>

            </div>
          </div>
        )}

        {/* --- VIEW 3: 30-DAY OVERALL MILEAGE & CHALLENGE STATUS --- */}
        {activeTab === 'challenge' && (
          <div className="space-y-6">
            
            {/* Main Progress Hero Card */}
            <div className={`p-8 rounded-3xl border relative overflow-hidden ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    PDM 30-Day Spiritual Challenge
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                    Overall User Mileage
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    Total prayer endurance accumulated over the 30-day PDM challenge period.
                  </p>
                </div>

                {/* Gauge Display */}
                <div className="flex items-center gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="text-center">
                    <span className="text-4xl sm:text-5xl font-black text-amber-400">
                      {userStats.total30DayHours.toFixed(1)}
                    </span>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Total Hours
                    </span>
                  </div>
                  <div className="h-12 w-[1px] bg-slate-800"></div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-purple-400">
                      {userStats.goal30Day} hrs
                    </span>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      30-Day Goal
                    </span>
                  </div>
                </div>

              </div>

              {/* Progress Bar */}
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">30-Day Goal Completion</span>
                  <span className="text-amber-400 font-bold">{userStats.progressPercent}% Completed</span>
                </div>
                <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${userStats.progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Challenge Breakdown Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="text-xs text-slate-400 mb-1">Average Daily Prayer</div>
                <div className="text-2xl font-bold text-amber-400">
                  {(userStats.total30DayHours / 30).toFixed(1)} <span className="text-xs font-normal text-slate-400">hrs/day</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="text-xs text-slate-400 mb-1">Total Recorded Sessions</div>
                <div className="text-2xl font-bold text-purple-400">
                  {userStats.totalEntries} <span className="text-xs font-normal text-slate-400">entries</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="text-xs text-slate-400 mb-1">Status Badge</div>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {userStats.total30DayHours >= 60 ? 'Endurance Conqueror' : 'Devoted Warrior'}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- VIEW 4: PERSONAL PRAYER LOG HISTORY --- */}
        {activeTab === 'history' && (
          <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Your Personal Prayer History
                </h2>
                <p className="text-xs text-slate-400 mt-1">Detailed timestamps of all logged prayer sessions.</p>
              </div>
              
              <button
                onClick={() => setActiveTab('log')}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition"
              >
                + Add Entry
              </button>
            </div>

            {userLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No prayer sessions logged yet.</p>
                <p className="text-xs text-slate-600 mt-1">Start by clicking "Log Prayer Hours" above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-2xl border transition ${darkMode ? 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                          {log.duration}h
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{log.date}</div>
                          <div className="text-[11px] text-slate-400">
                            Duration: {log.duration} hours ({Math.round(log.duration * 60)} minutes)
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                        Verified Log
                      </div>
                    </div>

                    {log.reflection && (
                      <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300 italic">
                        "{log.reflection}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
}
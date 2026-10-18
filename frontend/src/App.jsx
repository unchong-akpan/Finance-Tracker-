import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Recurring from './pages/Recurring';
import History from './pages/History';
import Login from './pages/Login';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/recurring', label: 'Recurring' },
  { to: '/history', label: 'History' },
];

function NavLinks({ mobile = false, onNavigate }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            mobile
              ? `block px-3 py-2 rounded-md text-base font-medium ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`
              : `px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ft_user'));
    } catch {
      return null;
    }
  });
  const menuButtonRef = useRef(null);
  const mainRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    if (mobileMenuOpen) {
      const handleKey = (e) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  const handleLogout = () => {
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
    setUser(null);
    navigate('/login');
  };

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <a
          href="#main-content"
          className="sr-only-focusable fixed top-2 left-2 z-[100] bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          Skip to main content
        </a>

        <nav
          aria-label="Main navigation"
          className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 relative"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mr-8">
                  FinanceTracker
                </h1>
                <div className="hidden md:flex space-x-1">
                  <NavLinks />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {user && (
                  <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
                    {user.name || user.email}
                  </span>
                )}

                <button
                  onClick={() => setDark(!dark)}
                  aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  {dark ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  )}
                </button>

                {user && (
                  <button
                    onClick={handleLogout}
                    aria-label="Sign out"
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                )}

                <button
                  ref={menuButtonRef}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-menu"
                  className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  {mobileMenuOpen ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div
              id="mobile-menu"
              className="md:hidden border-t dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="px-4 py-3 space-y-1">
                <NavLinks mobile onNavigate={closeMobileMenu} />
                {user && (
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleLogout();
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/history" element={<History />} />
            <Route
              path="*"
              element={
                <p className="text-center text-gray-500 dark:text-gray-400 py-16">Page not found</p>
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import LGASearch from '../Search/LGASearch';
import RefreshControl from '../common/RefreshControl';

export default function Header() {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
              aria-expanded={!sidebarCollapsed}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0 flex items-center gap-3">
               {/* Logo / Icon Placeholder */}
              <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm hidden sm:block">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate leading-tight">
                  Cholera Surveillance
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  National Space Research and Development Agency (NASRDA)
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block w-48 lg:w-64">
              <LGASearch />
            </div>
            <RefreshControl />

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 border-l pl-2 sm:pl-4 ml-2 sm:ml-4">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-32">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  title="Logout"
                  aria-label="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden mt-3 pb-1">
          <LGASearch />
        </div>

        {/* Mobile User Info */}
        {user && (
          <div className="md:hidden mt-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
